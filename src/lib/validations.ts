import { z } from "zod";

export const UserRoleSchema = z.enum(["ADMIN", "BIDDER", "COORDINATOR"]);
export const PlatformSchema = z.enum(["UPWORK", "FREELANCER", "DIRECT"]);
export const AccountTypeSchema = z.enum(["INDIVIDUAL", "AGENCY"]);
export const ProfileStatusSchema = z.enum(["ACTIVE", "REVIEW_REQUIRED", "PAUSED"]);
export const OpportunityStatusSchema = z.enum([
  "NEW",
  "QUALIFIED",
  "DISQUALIFIED",
  "PROPOSAL_SUBMITTED",
  "INTERVIEWING",
  "WON",
  "LOST",
]);
export const BudgetTypeSchema = z.enum(["FIXED", "HOURLY"]);
export const ProposalStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "VIEWED",
  "RESPONDED",
  "INTERVIEW",
  "ACCEPTED",
  "DECLINED",
]);
export const TopUpStatusSchema = z.enum(["NONE", "REQUESTED", "APPROVED", "REJECTED"]);
export const BidTransactionTypeSchema = z.enum([
  "INITIAL_ALLOCATION",
  "TOP_UP_ALLOCATION",
  "PROPOSAL_SPEND",
  "REFUND",
  "ADJUSTMENT",
]);
export const FollowUpStatusSchema = z.enum(["PENDING", "COMPLETED", "MISSED", "CANCELLED"]);
export const ContractStatusSchema = z.enum(["ACTIVE", "COMPLETED", "PAUSED", "TERMINATED"]);
export const HandoverStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "ACCEPTED"]);
export const FinanceTypeSchema = z.enum(["REVENUE", "DIRECT_COST", "CONNECTS_EXPENSE"]);

// Auth Schemas
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const RegisterUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: UserRoleSchema,
});

// Profile Schemas
export const CreateProfileSchema = z.object({
  name: z.string().min(2, "Profile name required"),
  platform: PlatformSchema,
  accountType: AccountTypeSchema.default("INDIVIDUAL"),
  assignedBidderId: z.string().optional(),
  status: ProfileStatusSchema.default("ACTIVE"),
  weeklyAllocationCap: z.number().int().min(50).max(500).default(500),
  sharedAgencyConnectsBalance: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export const ProfileClearanceSchema = z.object({
  profileId: z.string().min(1, "Profile ID required"),
  notes: z.string().min(5, "Clearance justification required"),
  targetStatus: z.enum(["ACTIVE", "PAUSED"]).default("ACTIVE"),
});

// Opportunity Schemas
export const QuickAddJobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  clientName: z.string().min(2, "Client name required"),
  platform: PlatformSchema,
  jobUrl: z.string().url("Must be a valid job posting URL"),
  platformJobId: z.string().optional(),
  budgetType: BudgetTypeSchema,
  budgetAmountCents: z.number().int().min(0, "Budget cannot be negative"), // In integer cents
  hourlyRateMinCents: z.number().int().min(0).optional(),
  hourlyRateMaxCents: z.number().int().min(0).optional(),
  assignedBidderId: z.string().optional(),
  assignedProfileId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateOpportunitySchema = QuickAddJobSchema.partial().extend({
  status: OpportunityStatusSchema.optional(),
  score: z.number().min(0).max(100).optional(),
  qualificationNotes: z.string().optional(),
  hardStopReason: z.string().optional(),
});

// Qualification Assessment Schema
export const QualificationSchema = z.object({
  opportunityId: z.string().min(1, "Opportunity ID required"),
  clientPaymentVerified: z.boolean(),
  clientSpendCents: z.number().int().min(0),
  clientHireRatePercent: z.number().min(0).max(100),
  budgetFitScore: z.number().min(0).max(20),
  skillsMatchScore: z.number().min(0).max(20),
  proposalCompetitionScore: z.number().min(0).max(15),
  hardStopTriggered: z.boolean().default(false),
  hardStopReason: z.string().optional(),
  notes: z.string().optional(),
});

// Proposal Schema
export const CreateProposalSchema = z.object({
  opportunityId: z.string().min(1, "Opportunity ID required"),
  profileId: z.string().min(1, "Profile ID required"),
  proposalText: z.string().min(20, "Proposal text must be at least 20 characters"),
  bidAmountCents: z.number().int().positive("Bid amount must be positive"),
  connectsUsed: z.number().int().min(0, "Connects must be non-negative"),
  platformFeeCents: z.number().int().min(0).optional(),
  status: ProposalStatusSchema.default("SUBMITTED"),
});

export const UpdateProposalStatusSchema = z.object({
  status: ProposalStatusSchema,
  outcomeNotes: z.string().optional(),
});

// Budget Allocation Schemas
export const InitialAllocationSchema = z.object({
  profileId: z.string().min(1, "Profile ID required"),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  allocationAmount: z.number().int().min(1).max(300, "Initial allocation cannot exceed 300 connects"),
});

export const RequestTopUpSchema = z.object({
  periodId: z.string().min(1, "Period ID required"),
  requestedAmount: z.number().int().min(1).max(200, "Top-up cannot exceed 200 connects"),
  reason: z.string().min(10, "A valid justification is required"),
});

export const ReviewTopUpSchema = z.object({
  periodId: z.string().min(1, "Period ID required"),
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().optional(),
});

// Follow-up Schema
export const CreateFollowUpSchema = z.object({
  opportunityId: z.string().min(1, "Opportunity ID required"),
  proposalId: z.string().optional(),
  assignedTo: z.string().min(1, "Assignee required"),
  scheduledDate: z.string().datetime("Must be valid ISO timestamp"),
  notes: z.string().optional(),
});

export const UpdateFollowUpSchema = z.object({
  status: FollowUpStatusSchema,
  notes: z.string().optional(),
});

// Contract & Revenue Schemas
export const CreateContractSchema = z.object({
  opportunityId: z.string().min(1, "Opportunity ID required"),
  clientId: z.string().min(1, "Client ID required"),
  profileId: z.string().min(1, "Profile ID required"),
  title: z.string().min(3, "Contract title required"),
  contractType: BudgetTypeSchema,
  totalValueCents: z.number().int().positive("Total contract value required"),
  hourlyRateCents: z.number().int().optional(),
  startDate: z.string().datetime(),
});

export const CreateHandoverSchema = z.object({
  contractId: z.string().min(1, "Contract ID required"),
  opportunityId: z.string().min(1, "Opportunity ID required"),
  coordinatorId: z.string().min(1, "Coordinator ID required"),
  handoverNotes: z.string().min(10, "Handover notes required"),
  repositoryUrl: z.string().url().optional().or(z.literal("")),
  driveFolderUrl: z.string().url().optional().or(z.literal("")),
  communicationChannel: z.string().optional(),
});

export const CreateFinanceRecordSchema = z.object({
  contractId: z.string().optional(),
  type: FinanceTypeSchema,
  amountCents: z.number().int().positive("Amount must be positive"),
  currency: z.string().default("USD"),
  description: z.string().min(3, "Description required"),
  transactionDate: z.string().datetime().default(() => new Date().toISOString()),
});
