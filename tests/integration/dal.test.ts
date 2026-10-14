import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ObjectId } from "mongodb";
import { ensureIndexes } from "../../src/lib/db";
import { getMondayOfWeek } from "../../src/lib/budget";
import {
  createProfile,
  clearProfileReview,
  createOpportunity,
  updateOpportunity,
  qualifyOpportunity,
  allocateInitialBudget,
  requestThursdayTopUp,
  reviewThursdayTopUp,
  createProposal,
  updateProposalStatus,
  createContractFromWonOpportunity,
  recordFinance,
  getFinancialSummary,
} from "../../src/lib/dal";
import type { SessionUser } from "../../src/types";

let mongoServer: MongoMemoryServer;
let client: MongoClient;

const mockAdmin: SessionUser = {
  id: "650000000000000000000001",
  name: "Devon Vance (Admin)",
  email: "admin@bethebest.com",
  role: "ADMIN",
};

const mockBidder: SessionUser = {
  id: "650000000000000000000002",
  name: "Alex Cross (Bidder)",
  email: "bidder@bethebest.com",
  role: "BIDDER",
};

const mockCoordinator: SessionUser = {
  id: "650000000000000000000003",
  name: "Elena Rostova (Coordinator)",
  email: "coordinator@bethebest.com",
  role: "COORDINATOR",
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 60000,
    },
  });
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB = "bethebest_test";
  // Reset cached client promise so getMongoClientPromise connects to test server
  global._mongoClientPromise = undefined;

  client = new MongoClient(uri);
  await client.connect();
  await ensureIndexes();
}, 120000);

afterAll(async () => {
  if (client) await client.close();
  if (mongoServer) await mongoServer.stop();
});

describe("Integration Tests: Real MongoDB DAL Operations", () => {
  let activeProfileId: string;
  let rakeshProfileId: string;

  beforeEach(async () => {
    // Seed fresh test profiles
    const db = client.db("bethebest_test");
    await db.collection("profiles").deleteMany({});
    await db.collection("opportunities").deleteMany({});
    await db.collection("qualifications").deleteMany({});
    await db.collection("proposals").deleteMany({});
    await db.collection("budget_periods").deleteMany({});
    await db.collection("bid_transactions").deleteMany({});
    await db.collection("contracts").deleteMany({});
    await db.collection("finances").deleteMany({});

    const p1 = await createProfile(
      {
        name: "Standard Upwork Profile",
        platform: "UPWORK",
        accountType: "INDIVIDUAL",
        status: "ACTIVE",
        weeklyAllocationCap: 500,
      },
      mockAdmin
    );
    activeProfileId = p1._id!;

    const p2 = await createProfile(
      {
        name: "Rakesh Sharma Profile",
        platform: "UPWORK",
        accountType: "INDIVIDUAL",
        status: "REVIEW_REQUIRED",
        weeklyAllocationCap: 500,
        reviewNotes: "Compliance review pending",
      },
      mockAdmin
    );
    rakeshProfileId = p2._id!;
  });

  it("prevents budget release for profile marked 'Review required' until explicit clearance", async () => {
    // Attempting allocation on Rakesh profile must fail
    await expect(
      allocateInitialBudget(rakeshProfileId, getMondayOfWeek(), 200, mockAdmin)
    ).rejects.toThrow("Review required");

    // Clear Rakesh review as ADMIN
    const cleared = await clearProfileReview(
      rakeshProfileId,
      mockAdmin,
      "Identity and rate card audited and approved",
      "ACTIVE"
    );
    expect(cleared?.status).toBe("ACTIVE");

    // Allocation should now succeed
    const allocation = await allocateInitialBudget(rakeshProfileId, getMondayOfWeek(), 250, mockAdmin);
    expect(allocation?.initialAllocation).toBe(250);
    expect(allocation?.remainingBalance).toBe(250);
  });

  it("handles initial allocation, Thursday top-up request, and approval workflow", async () => {
    // 1. Initial allocation (300 connects)
    const initial = await allocateInitialBudget(activeProfileId, getMondayOfWeek(), 300, mockAdmin);
    expect(initial?.remainingBalance).toBe(300);

    // 2. Request Thursday Top-up (150 connects)
    const periodId = initial!._id!.toString();
    const requested = await requestThursdayTopUp(
      periodId,
      150,
      "Surge in enterprise RFP invites this week",
      mockBidder
    );
    expect(requested?.topUpStatus).toBe("REQUESTED");
    expect(requested?.topUpRequestedAmount).toBe(150);

    // 3. Bidder cannot approve their own top-up
    await expect(
      reviewThursdayTopUp(periodId, "APPROVED", mockBidder)
    ).rejects.toThrow("Forbidden");

    // 4. Admin approves top-up
    const approved = await reviewThursdayTopUp(periodId, "APPROVED", mockAdmin, "Approved for enterprise RFPs");
    expect(approved?.topUpStatus).toBe("APPROVED");
    expect(approved?.topUpApproved).toBe(150);
    expect(approved?.totalAllocation).toBe(450);
    expect(approved?.remainingBalance).toBe(450);

    // Verify transaction ledger
    const db = client.db("bethebest_test");
    const txs = await db.collection("bid_transactions").find({ periodId }).toArray();
    expect(txs.length).toBe(2); // INITIAL_ALLOCATION + TOP_UP_ALLOCATION
  });

  it("rejects over-limit budget allocation and duplicate job URLs", async () => {
    // Exceeding 300 initial connects
    await expect(
      allocateInitialBudget(activeProfileId, getMondayOfWeek(), 400, mockAdmin)
    ).rejects.toThrow("cannot exceed 300");

    // Create Opportunity
    const jobUrl = "https://www.upwork.com/jobs/~01integrationtestjob";
    const opp = await createOpportunity(
      {
        title: "Integration Test Job",
        clientName: "Test Client LLC",
        platform: "UPWORK",
        jobUrl,
        budgetType: "FIXED",
        budgetAmountCents: 500000, // $5,000.00
      },
      mockBidder
    );
    expect(opp._id).toBeDefined();

    // Duplicate Job URL must fail
    await expect(
      createOpportunity(
        {
          title: "Duplicate Job Attempt",
          clientName: "Different Name",
          platform: "UPWORK",
          jobUrl,
          budgetType: "FIXED",
          budgetAmountCents: 300000,
        },
        mockBidder
      )
    ).rejects.toThrow("Job posting already exists in pipeline");
  });

  it("records qualification, saves proposal with atomic connects deduction, tracks interview, and converts won opportunity to contract", async () => {
    // 1. Allocate initial budget (300)
    await allocateInitialBudget(activeProfileId, getMondayOfWeek(), 300, mockAdmin);

    // 2. Create and qualify opportunity
    const opp = await createOpportunity(
      {
        title: "Full Stack Next.js Cloud App",
        clientName: "Acme Corp",
        platform: "UPWORK",
        jobUrl: "https://www.upwork.com/jobs/~01qualifysubmitwin",
        budgetType: "FIXED",
        budgetAmountCents: 1000000, // $10,000
      },
      mockBidder
    );

    const qualified = await qualifyOpportunity(
      {
        opportunityId: opp._id!,
        clientPaymentVerified: true,
        clientSpendCents: 3000000, // $30k spend
        clientHireRatePercent: 75,
        budgetFitScore: 20,
        skillsMatchScore: 20,
        proposalCompetitionScore: 10,
        notes: "High potential client",
      },
      mockBidder
    );
    expect(qualified.status).toBe("QUALIFIED");
    expect(qualified.assessment.totalScore).toBeGreaterThanOrEqual(65);

    // 3. Submit Proposal (16 connects used)
    const proposal = await createProposal(
      {
        opportunityId: opp._id!,
        profileId: activeProfileId,
        proposalText: "Detailed enterprise pitch for Next.js and MongoDB architecture with proven case studies.",
        bidAmountCents: 1000000,
        connectsUsed: 16,
      },
      mockBidder
    );
    expect(proposal._id).toBeDefined();
    expect(proposal.status).toBe("SUBMITTED");

    // Verify balance after deduction
    const db = client.db("bethebest_test");
    const period = await db.collection("budget_periods").findOne({ profileId: activeProfileId });
    expect(period?.remainingBalance).toBe(284); // 300 - 16
    expect(period?.totalSpent).toBe(16);

    // 4. Update status: Viewed -> Interview
    await updateProposalStatus(proposal._id!, "VIEWED", mockBidder);
    const interviewed = await updateProposalStatus(proposal._id!, "INTERVIEW", mockBidder, "Client scheduled tech screen");
    expect(interviewed?.status).toBe("INTERVIEW");

    const updatedOpp = await db.collection("opportunities").findOne({ _id: new ObjectId(opp._id!) });
    expect(updatedOpp?.status).toBe("INTERVIEWING");

    // 5. Convert Won Opportunity to Contract
    const contract = await createContractFromWonOpportunity(
      {
        opportunityId: opp._id!,
        clientName: "Acme Corp",
        platform: "UPWORK",
        platformClientId: "client_upwork_987",
        profileId: activeProfileId,
        title: "Acme Corp Cloud Architecture Contract",
        contractType: "FIXED",
        totalValueCents: 1000000, // $10,000
        startDate: new Date("2026-10-15"),
      },
      mockCoordinator
    );
    expect(contract._id).toBeDefined();
    expect(contract.status).toBe("ACTIVE");

    const wonOpp = await db.collection("opportunities").findOne({ _id: new ObjectId(opp._id!) });
    expect(wonOpp?.status).toBe("WON");

    // 6. Record Revenue & Direct Costs
    await recordFinance(
      {
        contractId: contract._id,
        type: "REVENUE",
        amountCents: 1000000,
        description: "Initial Milestone Payment",
        transactionDate: new Date(),
      },
      mockCoordinator
    );

    await recordFinance(
      {
        contractId: contract._id,
        type: "DIRECT_COST",
        amountCents: 200000, // $2,000 developer wages
        description: "Milestone 1 Developer Cost",
        transactionDate: new Date(),
      },
      mockCoordinator
    );

    await recordFinance(
      {
        type: "CONNECTS_EXPENSE",
        amountCents: 240, // 16 connects * $0.15 = $2.40
        description: "Connects acquisition cost",
        transactionDate: new Date(),
      },
      mockAdmin
    );

    const summary = await getFinancialSummary();
    expect(summary.totalRevenueCents).toBe(1000000);
    expect(summary.totalDirectCostsCents).toBe(200000);
    expect(summary.totalConnectsExpenseCents).toBe(240);
    expect(summary.netProfitCents).toBe(799760);
    expect(summary.roiPercent).toBeGreaterThan(390);
  });
});
