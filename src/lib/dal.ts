import { ObjectId } from "mongodb";
import { getCollections, getDatabase } from "./db";
import { evaluateQualification } from "./scoring";
import {
  validateInitialAllocation,
  validateTopUpRequest,
  validateTopUpApproval,
  getMondayOfWeek,
  getSundayOfWeek,
} from "./budget";
import { assertPermission } from "./permissions";
import type {
  User,
  Profile,
  Opportunity,
  QualificationAssessment,
  Proposal,
  BudgetPeriod,
  BidTransaction,
  FollowUp,
  Client,
  Contract,
  ProjectHandover,
  FinanceRecord,
  SessionUser,
  OpportunityStatus,
  ProposalStatus,
  FollowUpStatus,
  HandoverStatus,
} from "@/types";

// Audit Logging Helper
export async function logAuditEvent(
  actorId: string,
  actorEmail: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>
): Promise<void> {
  const { auditLogs } = await getCollections();
  await auditLogs.insertOne({
    actorId,
    actorEmail,
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date(),
  });
}

// ==========================================
// PROFILES
// ==========================================

export async function listProfiles(filter: Partial<Profile> = {}) {
  const { profiles } = await getCollections();
  return profiles.find(filter).sort({ name: 1 }).toArray();
}

export async function getProfileById(id: string) {
  const { profiles } = await getCollections();
  return profiles.findOne({ _id: new ObjectId(id) as unknown as string });
}

export async function createProfile(
  data: Omit<Profile, "_id" | "createdAt" | "updatedAt">,
  actor: SessionUser
) {
  assertPermission(actor.role, "profile:create");
  const { profiles } = await getCollections();

  const newProfile: Profile = {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await profiles.insertOne(newProfile);
  await logAuditEvent(actor.id, actor.email, "CREATE_PROFILE", "profile", result.insertedId.toString(), {
    name: data.name,
    platform: data.platform,
    status: data.status,
  });

  return { ...newProfile, _id: result.insertedId.toString() };
}

export async function clearProfileReview(
  profileId: string,
  actor: SessionUser,
  notes: string,
  targetStatus: "ACTIVE" | "PAUSED" = "ACTIVE"
) {
  assertPermission(actor.role, "profile:clear_review");
  const { profiles } = await getCollections();

  const profile = await profiles.findOne({ _id: new ObjectId(profileId) as unknown as string });
  if (!profile) throw new Error("Profile not found");

  const result = await profiles.findOneAndUpdate(
    { _id: new ObjectId(profileId) as unknown as string },
    {
      $set: {
        status: targetStatus,
        reviewNotes: notes,
        clearedBy: actor.id,
        clearedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  await logAuditEvent(actor.id, actor.email, "CLEAR_PROFILE_REVIEW", "profile", profileId, {
    previousStatus: profile.status,
    newStatus: targetStatus,
    notes,
  });

  return result;
}

// ==========================================
// OPPORTUNITIES
// ==========================================

export async function listOpportunities(
  filter: Record<string, unknown> = {},
  page: number = 1,
  limit: number = 25
) {
  const { opportunities } = await getCollections();
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    opportunities
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    opportunities.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getOpportunityById(id: string) {
  const { opportunities } = await getCollections();
  return opportunities.findOne({ _id: new ObjectId(id) as unknown as string });
}

export async function createOpportunity(
  data: Omit<Opportunity, "_id" | "status" | "createdAt" | "updatedAt">,
  actor: SessionUser
) {
  assertPermission(actor.role, "opportunity:create");
  const { opportunities } = await getCollections();

  // Check unique URL
  const existing = await opportunities.findOne({ jobUrl: data.jobUrl });
  if (existing) {
    throw new Error(`Job posting already exists in pipeline (ID: ${existing._id})`);
  }

  const opp: Opportunity = {
    ...data,
    status: "NEW",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await opportunities.insertOne(opp);
  await logAuditEvent(actor.id, actor.email, "CREATE_OPPORTUNITY", "opportunity", result.insertedId.toString(), {
    title: data.title,
    clientName: data.clientName,
    platform: data.platform,
    budgetAmountCents: data.budgetAmountCents,
  });

  return { ...opp, _id: result.insertedId.toString() };
}

export async function updateOpportunity(
  id: string,
  updates: Partial<Opportunity>,
  actor: SessionUser
) {
  const { opportunities } = await getCollections();
  const result = await opportunities.findOneAndUpdate(
    { _id: new ObjectId(id) as unknown as string },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (!result) throw new Error("Opportunity not found");

  await logAuditEvent(actor.id, actor.email, "UPDATE_OPPORTUNITY", "opportunity", id, updates as Record<string, unknown>);
  return result;
}

// ==========================================
// QUALIFICATIONS
// ==========================================

export async function qualifyOpportunity(
  input: {
    opportunityId: string;
    clientPaymentVerified: boolean;
    clientSpendCents: number;
    clientHireRatePercent: number;
    budgetFitScore: number;
    skillsMatchScore: number;
    proposalCompetitionScore: number;
    hardStopTriggered?: boolean;
    hardStopReason?: string;
    notes?: string;
  },
  actor: SessionUser
) {
  assertPermission(actor.role, "opportunity:qualify");
  const { opportunities, qualifications } = await getCollections();

  const opp = await opportunities.findOne({ _id: new ObjectId(input.opportunityId) as unknown as string });
  if (!opp) throw new Error("Opportunity not found");

  const evalResult = evaluateQualification({
    clientPaymentVerified: input.clientPaymentVerified,
    clientSpendCents: input.clientSpendCents,
    clientHireRatePercent: input.clientHireRatePercent,
    budgetFitScore: input.budgetFitScore,
    skillsMatchScore: input.skillsMatchScore,
    proposalCompetitionScore: input.proposalCompetitionScore,
    budgetAmountCents: opp.budgetAmountCents,
    hourlyRateMinCents: opp.hourlyRateMinCents,
    hourlyRateMaxCents: opp.hourlyRateMaxCents,
    isHourly: opp.budgetType === "HOURLY",
    manualHardStop: input.hardStopTriggered,
    manualHardStopReason: input.hardStopReason,
  });

  const newStatus: OpportunityStatus = evalResult.passed ? "QUALIFIED" : "DISQUALIFIED";

  const assessment: QualificationAssessment = {
    opportunityId: input.opportunityId,
    clientPaymentVerified: input.clientPaymentVerified,
    clientSpendCents: input.clientSpendCents,
    clientHireRatePercent: input.clientHireRatePercent,
    budgetFitScore: input.budgetFitScore,
    skillsMatchScore: input.skillsMatchScore,
    proposalCompetitionScore: input.proposalCompetitionScore,
    hardStopTriggered: evalResult.hardStopTriggered,
    hardStopReason: evalResult.hardStopReason,
    totalScore: evalResult.totalScore,
    passed: evalResult.passed,
    evaluatedBy: actor.id,
    evaluatedAt: new Date(),
  };

  await qualifications.updateOne(
    { opportunityId: input.opportunityId },
    { $set: assessment },
    { upsert: true }
  );

  await opportunities.updateOne(
    { _id: new ObjectId(input.opportunityId) as unknown as string },
    {
      $set: {
        status: newStatus,
        score: evalResult.totalScore,
        qualificationNotes: input.notes,
        hardStopReason: evalResult.hardStopReason,
        updatedAt: new Date(),
      },
    }
  );

  await logAuditEvent(actor.id, actor.email, "QUALIFY_OPPORTUNITY", "opportunity", input.opportunityId, {
    score: evalResult.totalScore,
    passed: evalResult.passed,
    status: newStatus,
    hardStop: evalResult.hardStopTriggered,
  });

  return { assessment, status: newStatus };
}

// ==========================================
// BUDGET PERIODS & CONNECTS LEDGER
// ==========================================

export async function getOrCreateCurrentBudgetPeriod(profileId: string): Promise<BudgetPeriod> {
  const { budgetPeriods, profiles } = await getCollections();
  const monday = getMondayOfWeek();
  const sunday = getSundayOfWeek();

  const profile = await profiles.findOne({ _id: new ObjectId(profileId) as unknown as string });
  if (!profile) throw new Error("Profile not found");

  let period = await budgetPeriods.findOne({
    profileId,
    weekStartDate: monday,
  });

  if (!period) {
    const newPeriod: BudgetPeriod = {
      weekStartDate: monday,
      weekEndDate: sunday,
      profileId,
      initialAllocation: 0,
      topUpApproved: 0,
      totalAllocation: 0,
      totalSpent: 0,
      remainingBalance: 0,
      topUpStatus: "NONE",
      topUpRequestedAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await budgetPeriods.insertOne(newPeriod);
    period = { ...newPeriod, _id: res.insertedId.toString() };
  }

  return period;
}

export async function allocateInitialBudget(
  profileId: string,
  weekStartDate: string,
  amount: number,
  actor: SessionUser
) {
  assertPermission(actor.role, "budget:allocate_initial");
  const { budgetPeriods, profiles, bidTransactions } = await getCollections();

  const profile = await profiles.findOne({ _id: new ObjectId(profileId) as unknown as string });
  if (!profile) throw new Error("Profile not found");

  const isCleared = !!profile.clearedAt;
  const validation = validateInitialAllocation(amount, profile.status, profile.name, isCleared);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const sunday = getSundayOfWeek(new Date(weekStartDate));

  // Atomic upsert with conditional state
  const updated = await budgetPeriods.findOneAndUpdate(
    { profileId, weekStartDate },
    {
      $set: {
        weekEndDate: sunday,
        initialAllocation: amount,
        totalAllocation: amount, // reset base allocation
        remainingBalance: amount, // set fresh balance
        totalSpent: 0,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        profileId,
        weekStartDate,
        topUpApproved: 0,
        topUpStatus: "NONE",
        topUpRequestedAmount: 0,
        createdAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  const periodId = updated?._id?.toString() || "unknown";

  // Create immutable ledger transaction
  const tx: BidTransaction = {
    periodId,
    profileId,
    bidderId: actor.id,
    type: "INITIAL_ALLOCATION",
    amount,
    balanceAfter: amount,
    note: `Initial weekly allocation of ${amount} connects set by ${actor.name}`,
    performedBy: actor.id,
    createdAt: new Date(),
  };

  await bidTransactions.insertOne(tx);
  await logAuditEvent(actor.id, actor.email, "INITIAL_BUDGET_ALLOCATION", "budget_period", periodId, {
    profileId,
    amount,
  });

  return updated;
}

export async function requestThursdayTopUp(
  periodId: string,
  requestedAmount: number,
  reason: string,
  actor: SessionUser
) {
  assertPermission(actor.role, "budget:request_topup");
  const { budgetPeriods, profiles } = await getCollections();

  const period = await budgetPeriods.findOne({ _id: new ObjectId(periodId) as unknown as string });
  if (!period) throw new Error("Budget period not found");

  const profile = await profiles.findOne({ _id: new ObjectId(period.profileId) as unknown as string });
  if (!profile) throw new Error("Profile not found");

  const validation = validateTopUpRequest(requestedAmount, period.initialAllocation, profile.status);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const result = await budgetPeriods.findOneAndUpdate(
    { _id: new ObjectId(periodId) as unknown as string },
    {
      $set: {
        topUpStatus: "REQUESTED",
        topUpRequestedAmount: requestedAmount,
        topUpRequestedBy: actor.id,
        topUpReason: reason,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  await logAuditEvent(actor.id, actor.email, "REQUEST_TOP_UP", "budget_period", periodId, {
    requestedAmount,
    reason,
  });

  return result;
}

export async function reviewThursdayTopUp(
  periodId: string,
  decision: "APPROVED" | "REJECTED",
  actor: SessionUser,
  notes?: string
) {
  assertPermission(actor.role, "budget:approve_topup");
  const { budgetPeriods, profiles, bidTransactions } = await getCollections();

  const period = await budgetPeriods.findOne({ _id: new ObjectId(periodId) as unknown as string });
  if (!period) throw new Error("Budget period not found");
  if (period.topUpStatus !== "REQUESTED") {
    throw new Error("No pending top-up request found for this period.");
  }

  const profile = await profiles.findOne({ _id: new ObjectId(period.profileId) as unknown as string });
  if (!profile) throw new Error("Profile not found");

  if (decision === "REJECTED") {
    const result = await budgetPeriods.findOneAndUpdate(
      { _id: new ObjectId(periodId) as unknown as string },
      {
        $set: {
          topUpStatus: "REJECTED",
          topUpApprovedBy: actor.id,
          topUpApprovedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
    await logAuditEvent(actor.id, actor.email, "REJECT_TOP_UP", "budget_period", periodId, { notes });
    return result;
  }

  // Decision === APPROVED
  const amountToApprove = period.topUpRequestedAmount;
  const validation = validateTopUpApproval(actor.role, period.initialAllocation, amountToApprove, profile.status);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Atomic update: increment approved, total, remaining balance
  const result = await budgetPeriods.findOneAndUpdate(
    {
      _id: new ObjectId(periodId) as unknown as string,
      topUpStatus: "REQUESTED",
    },
    {
      $set: {
        topUpStatus: "APPROVED",
        topUpApproved: amountToApprove,
        topUpApprovedBy: actor.id,
        topUpApprovedAt: new Date(),
        updatedAt: new Date(),
      },
      $inc: {
        totalAllocation: amountToApprove,
        remainingBalance: amountToApprove,
      },
    },
    { returnDocument: "after" }
  );

  if (!result) {
    throw new Error("Top-up request was already processed or no longer pending.");
  }

  // Record ledger entry
  const tx: BidTransaction = {
    periodId,
    profileId: period.profileId,
    bidderId: period.topUpRequestedBy || actor.id,
    type: "TOP_UP_ALLOCATION",
    amount: amountToApprove,
    balanceAfter: result.remainingBalance,
    note: `Thursday top-up of ${amountToApprove} connects approved by ${actor.name}. Reason: ${notes || period.topUpReason || "None provided"}`,
    performedBy: actor.id,
    createdAt: new Date(),
  };

  await bidTransactions.insertOne(tx);
  await logAuditEvent(actor.id, actor.email, "APPROVE_TOP_UP", "budget_period", periodId, {
    approvedAmount: amountToApprove,
    newBalance: result.remainingBalance,
  });

  return result;
}

// ==========================================
// PROPOSALS
// ==========================================

export async function createProposal(
  data: {
    opportunityId: string;
    profileId: string;
    proposalText: string;
    bidAmountCents: number;
    connectsUsed: number;
    platformFeeCents?: number;
  },
  actor: SessionUser
) {
  assertPermission(actor.role, "proposal:create");
  const { proposals, opportunities, profiles, budgetPeriods, bidTransactions } = await getCollections();

  const opp = await opportunities.findOne({ _id: new ObjectId(data.opportunityId) as unknown as string });
  if (!opp) throw new Error("Opportunity not found");

  const profile = await profiles.findOne({ _id: new ObjectId(data.profileId) as unknown as string });
  if (!profile) throw new Error("Profile not found");

  if (profile.status === "REVIEW_REQUIRED") {
    throw new Error("Cannot submit proposal: Profile is in 'Review required' state and blocked from budget usage.");
  }
  if (profile.status === "PAUSED") {
    throw new Error("Cannot submit proposal: Profile is paused.");
  }

  // Get current budget period
  const monday = getMondayOfWeek();
  const period = await getOrCreateCurrentBudgetPeriod(data.profileId);

  // Concurrency-safe atomic balance deduction
  if (data.connectsUsed > 0) {
    const updateResult = await budgetPeriods.findOneAndUpdate(
      {
        _id: new ObjectId(period._id) as unknown as string,
        remainingBalance: { $gte: data.connectsUsed },
      },
      {
        $inc: {
          remainingBalance: -data.connectsUsed,
          totalSpent: data.connectsUsed,
        },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" }
    );

    if (!updateResult) {
      throw new Error(
        `Insufficient connects balance! Available: ${period.remainingBalance}, Required: ${data.connectsUsed}. Request a Thursday top-up or admin allocation.`
      );
    }
  }

  const newProposal: Proposal = {
    opportunityId: data.opportunityId,
    profileId: data.profileId,
    bidderId: actor.id,
    proposalText: data.proposalText,
    bidAmountCents: data.bidAmountCents,
    connectsUsed: data.connectsUsed,
    platformFeeCents: data.platformFeeCents,
    status: "SUBMITTED",
    submittedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const propResult = await proposals.insertOne(newProposal);
  const proposalId = propResult.insertedId.toString();

  // Record ledger transaction
  if (data.connectsUsed > 0) {
    const currentPeriod = await budgetPeriods.findOne({ _id: new ObjectId(period._id) as unknown as string });
    const tx: BidTransaction = {
      periodId: period._id!.toString(),
      profileId: data.profileId,
      bidderId: actor.id,
      opportunityId: data.opportunityId,
      proposalId,
      type: "PROPOSAL_SPEND",
      amount: data.connectsUsed,
      balanceAfter: currentPeriod?.remainingBalance ?? 0,
      note: `Proposal submitted for "${opp.title}" (${data.connectsUsed} connects)`,
      performedBy: actor.id,
      createdAt: new Date(),
    };
    await bidTransactions.insertOne(tx);
  }

  // Advance opportunity status to PROPOSAL_SUBMITTED
  await opportunities.updateOne(
    { _id: new ObjectId(data.opportunityId) as unknown as string },
    {
      $set: {
        status: "PROPOSAL_SUBMITTED",
        assignedBidderId: actor.id,
        assignedProfileId: data.profileId,
        updatedAt: new Date(),
      },
    }
  );

  await logAuditEvent(actor.id, actor.email, "SUBMIT_PROPOSAL", "proposal", proposalId, {
    opportunityId: data.opportunityId,
    connectsUsed: data.connectsUsed,
    bidAmountCents: data.bidAmountCents,
  });

  return { ...newProposal, _id: proposalId };
}

export async function updateProposalStatus(
  proposalId: string,
  newStatus: ProposalStatus,
  actor: SessionUser,
  outcomeNotes?: string
) {
  const { proposals, opportunities } = await getCollections();
  const proposal = await proposals.findOne({ _id: new ObjectId(proposalId) as unknown as string });
  if (!proposal) throw new Error("Proposal not found");

  const updateFields: Partial<Proposal> = {
    status: newStatus,
    outcomeNotes,
    updatedAt: new Date(),
  };

  if (newStatus === "VIEWED" && !proposal.viewedAt) updateFields.viewedAt = new Date();
  if (newStatus === "RESPONDED" && !proposal.respondedAt) updateFields.respondedAt = new Date();
  if (newStatus === "INTERVIEW" && !proposal.interviewAt) {
    updateFields.interviewAt = new Date();
    await opportunities.updateOne(
      { _id: new ObjectId(proposal.opportunityId) as unknown as string },
      { $set: { status: "INTERVIEWING", updatedAt: new Date() } }
    );
  }

  const result = await proposals.findOneAndUpdate(
    { _id: new ObjectId(proposalId) as unknown as string },
    { $set: updateFields },
    { returnDocument: "after" }
  );

  await logAuditEvent(actor.id, actor.email, "UPDATE_PROPOSAL_STATUS", "proposal", proposalId, {
    previousStatus: proposal.status,
    newStatus,
  });

  return result;
}

// ==========================================
// FOLLOW-UPS
// ==========================================

export async function listFollowUps(filter: Record<string, unknown> = {}) {
  const { followUps } = await getCollections();
  return followUps.find(filter).sort({ scheduledDate: 1 }).toArray();
}

export async function createFollowUp(
  data: {
    opportunityId: string;
    proposalId?: string;
    assignedTo: string;
    scheduledDate: Date;
    notes?: string;
  },
  actor: SessionUser
) {
  const { followUps } = await getCollections();
  const followUp: FollowUp = {
    ...data,
    status: "PENDING",
    createdAt: new Date(),
  };

  const result = await followUps.insertOne(followUp);
  await logAuditEvent(actor.id, actor.email, "CREATE_FOLLOW_UP", "follow_up", result.insertedId.toString(), {
    opportunityId: data.opportunityId,
    scheduledDate: data.scheduledDate,
  });

  return { ...followUp, _id: result.insertedId.toString() };
}

export async function updateFollowUp(
  id: string,
  status: FollowUpStatus,
  notes?: string
) {
  const { followUps } = await getCollections();
  const updateDoc: Partial<FollowUp> = { status, notes };
  if (status === "COMPLETED") updateDoc.completedAt = new Date();

  return followUps.findOneAndUpdate(
    { _id: new ObjectId(id) as unknown as string },
    { $set: updateDoc },
    { returnDocument: "after" }
  );
}

// ==========================================
// CLIENTS, CONTRACTS & PROJECT HANDOVERS
// ==========================================

export async function createContractFromWonOpportunity(
  input: {
    opportunityId: string;
    clientName: string;
    platform: "UPWORK" | "FREELANCER" | "DIRECT";
    platformClientId: string;
    profileId: string;
    title: string;
    contractType: "FIXED" | "HOURLY";
    totalValueCents: number;
    hourlyRateCents?: number;
    startDate: Date;
  },
  actor: SessionUser
) {
  assertPermission(actor.role, "contract:manage");
  const { opportunities, clients, contracts } = await getCollections();

  const opp = await opportunities.findOne({ _id: new ObjectId(input.opportunityId) as unknown as string });
  if (!opp) throw new Error("Opportunity not found");

  // Upsert Client
  let client = await clients.findOne({ platformClientId: input.platformClientId });
  if (!client) {
    const newClient: Client = {
      name: input.clientName,
      platform: input.platform,
      platformClientId: input.platformClientId,
      totalHires: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const cRes = await clients.insertOne(newClient);
    client = { ...newClient, _id: cRes.insertedId.toString() };
  } else {
    await clients.updateOne(
      { _id: new ObjectId(client._id) as unknown as string },
      { $inc: { totalHires: 1 }, $set: { updatedAt: new Date() } }
    );
  }

  // Create Contract
  const contract: Contract = {
    opportunityId: input.opportunityId,
    clientId: client._id!.toString(),
    profileId: input.profileId,
    title: input.title,
    contractType: input.contractType,
    totalValueCents: input.totalValueCents,
    hourlyRateCents: input.hourlyRateCents,
    status: "ACTIVE",
    startDate: input.startDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const conRes = await contracts.insertOne(contract);
  const contractId = conRes.insertedId.toString();

  // Mark opportunity as WON
  await opportunities.updateOne(
    { _id: new ObjectId(input.opportunityId) as unknown as string },
    { $set: { status: "WON", updatedAt: new Date() } }
  );

  await logAuditEvent(actor.id, actor.email, "CREATE_CONTRACT", "contract", contractId, {
    opportunityId: input.opportunityId,
    totalValueCents: input.totalValueCents,
  });

  return { ...contract, _id: contractId };
}

export async function createProjectHandover(
  data: {
    contractId: string;
    opportunityId: string;
    coordinatorId: string;
    handoverNotes: string;
    repositoryUrl?: string;
    driveFolderUrl?: string;
    communicationChannel?: string;
  },
  actor: SessionUser
) {
  assertPermission(actor.role, "handover:manage");
  const { handovers } = await getCollections();

  const handover: ProjectHandover = {
    ...data,
    status: "PENDING",
    handedOverAt: new Date(),
    createdAt: new Date(),
  };

  const res = await handovers.insertOne(handover);
  const handoverId = res.insertedId.toString();

  await logAuditEvent(actor.id, actor.email, "CREATE_HANDOVER", "project_handover", handoverId, {
    contractId: data.contractId,
    coordinatorId: data.coordinatorId,
  });

  return { ...handover, _id: handoverId };
}

// ==========================================
// FINANCES
// ==========================================

export async function recordFinance(
  data: {
    contractId?: string;
    type: "REVENUE" | "DIRECT_COST" | "CONNECTS_EXPENSE";
    amountCents: number;
    currency?: string;
    description: string;
    transactionDate: Date;
  },
  actor: SessionUser
) {
  assertPermission(actor.role, "finance:record");
  const { finances } = await getCollections();

  const record: FinanceRecord = {
    contractId: data.contractId,
    type: data.type,
    amountCents: data.amountCents,
    currency: data.currency || "USD",
    description: data.description,
    transactionDate: data.transactionDate,
    recordedBy: actor.id,
    createdAt: new Date(),
  };

  const res = await finances.insertOne(record);
  await logAuditEvent(actor.id, actor.email, "RECORD_FINANCE", "finance", res.insertedId.toString(), {
    type: data.type,
    amountCents: data.amountCents,
  });

  return { ...record, _id: res.insertedId.toString() };
}

export async function getFinancialSummary() {
  const { finances } = await getCollections();
  const records = await finances.find().toArray();

  let totalRevenueCents = 0;
  let totalDirectCostsCents = 0;
  let totalConnectsExpenseCents = 0;

  for (const r of records) {
    if (r.type === "REVENUE") totalRevenueCents += r.amountCents;
    if (r.type === "DIRECT_COST") totalDirectCostsCents += r.amountCents;
    if (r.type === "CONNECTS_EXPENSE") totalConnectsExpenseCents += r.amountCents;
  }

  const netProfitCents = totalRevenueCents - (totalDirectCostsCents + totalConnectsExpenseCents);
  const totalCostCents = totalDirectCostsCents + totalConnectsExpenseCents;
  const roiPercent = totalCostCents > 0 ? (netProfitCents / totalCostCents) * 100 : 0;

  return {
    totalRevenueCents,
    totalDirectCostsCents,
    totalConnectsExpenseCents,
    netProfitCents,
    roiPercent: Math.round(roiPercent * 100) / 100,
  };
}
