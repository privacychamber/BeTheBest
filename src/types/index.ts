// Core domain types for BeTheBest

export type UserRole = "ADMIN" | "BIDDER" | "COORDINATOR";

export interface User {
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type Platform = "UPWORK" | "FREELANCER" | "DIRECT";
export type AccountType = "INDIVIDUAL" | "AGENCY";
export type ProfileStatus = "ACTIVE" | "REVIEW_REQUIRED" | "PAUSED";

export interface Profile {
  _id?: string;
  name: string;
  platform: Platform;
  accountType: AccountType;
  assignedBidderId?: string; // User ID
  status: ProfileStatus;
  reviewNotes?: string;
  clearedBy?: string; // Admin User ID who cleared review
  clearedAt?: Date;
  sharedAgencyConnectsBalance?: number; // Real agency pool balance
  weeklyAllocationCap: number; // Max 500 default
  createdAt: Date;
  updatedAt: Date;
}

export type OpportunityStatus = 
  | "NEW" 
  | "QUALIFIED" 
  | "DISQUALIFIED" 
  | "PROPOSAL_SUBMITTED" 
  | "INTERVIEWING" 
  | "WON" 
  | "LOST";

export type BudgetType = "FIXED" | "HOURLY";

export interface Opportunity {
  _id?: string;
  title: string;
  clientName: string;
  platform: Platform;
  jobUrl: string;
  platformJobId?: string;
  budgetType: BudgetType;
  budgetAmountCents: number; // Integer minor units (e.g. 50000 = $500.00)
  hourlyRateMinCents?: number;
  hourlyRateMaxCents?: number;
  status: OpportunityStatus;
  assignedBidderId?: string;
  assignedProfileId?: string;
  score?: number;
  qualificationNotes?: string;
  hardStopReason?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QualificationAssessment {
  _id?: string;
  opportunityId: string;
  clientPaymentVerified: boolean;
  clientSpendCents: number;
  clientHireRatePercent: number;
  budgetFitScore: number; // 0 - 20
  skillsMatchScore: number; // 0 - 20
  proposalCompetitionScore: number; // 0 - 15
  hardStopTriggered: boolean;
  hardStopReason?: string;
  totalScore: number; // 0 - 100
  passed: boolean; // >= 65 and !hardStopTriggered
  evaluatedBy: string; // User ID
  evaluatedAt: Date;
}

export type ProposalStatus = 
  | "DRAFT" 
  | "SUBMITTED" 
  | "VIEWED" 
  | "RESPONDED" 
  | "INTERVIEW" 
  | "ACCEPTED" 
  | "DECLINED";

export interface Proposal {
  _id?: string;
  opportunityId: string;
  profileId: string;
  bidderId: string;
  proposalText: string;
  bidAmountCents: number;
  connectsUsed: number; // e.g. 16 connects
  platformFeeCents?: number;
  status: ProposalStatus;
  submittedAt?: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  interviewAt?: Date;
  outcomeNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TopUpStatus = "NONE" | "REQUESTED" | "APPROVED" | "REJECTED";

export interface BudgetPeriod {
  _id?: string;
  weekStartDate: string; // YYYY-MM-DD (Monday)
  weekEndDate: string; // YYYY-MM-DD (Sunday)
  profileId: string;
  initialAllocation: number; // Max 300
  topUpApproved: number; // Max 200
  totalAllocation: number; // initialAllocation + topUpApproved (Max 500)
  totalSpent: number;
  remainingBalance: number;
  topUpStatus: TopUpStatus;
  topUpRequestedAmount: number;
  topUpRequestedBy?: string;
  topUpReason?: string;
  topUpApprovedBy?: string;
  topUpApprovedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type BidTransactionType = 
  | "INITIAL_ALLOCATION" 
  | "TOP_UP_ALLOCATION" 
  | "PROPOSAL_SPEND" 
  | "REFUND" 
  | "ADJUSTMENT";

export interface BidTransaction {
  _id?: string;
  periodId: string;
  profileId: string;
  bidderId: string;
  opportunityId?: string;
  proposalId?: string;
  type: BidTransactionType;
  amount: number; // Connects/bids spent or credited
  balanceAfter: number;
  note: string;
  performedBy: string;
  createdAt: Date;
}

export type FollowUpStatus = "PENDING" | "COMPLETED" | "MISSED" | "CANCELLED";

export interface FollowUp {
  _id?: string;
  opportunityId: string;
  proposalId?: string;
  assignedTo: string; // User ID
  scheduledDate: Date;
  status: FollowUpStatus;
  notes?: string;
  completedAt?: Date;
  createdAt: Date;
}

export interface Client {
  _id?: string;
  name: string;
  company?: string;
  platform: Platform;
  platformClientId: string;
  country?: string;
  totalHires: number;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ContractStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "TERMINATED";

export interface Contract {
  _id?: string;
  opportunityId: string;
  clientId: string;
  profileId: string;
  title: string;
  contractType: BudgetType;
  totalValueCents: number;
  hourlyRateCents?: number;
  status: ContractStatus;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type HandoverStatus = "PENDING" | "IN_PROGRESS" | "ACCEPTED";

export interface ProjectHandover {
  _id?: string;
  contractId: string;
  opportunityId: string;
  coordinatorId: string; // Project Coordinator ID
  handoverNotes: string;
  repositoryUrl?: string;
  driveFolderUrl?: string;
  communicationChannel?: string;
  status: HandoverStatus;
  handedOverAt?: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

export type FinanceType = "REVENUE" | "DIRECT_COST" | "CONNECTS_EXPENSE";

export interface FinanceRecord {
  _id?: string;
  contractId?: string;
  type: FinanceType;
  amountCents: number;
  currency: string; // default "USD"
  description: string;
  transactionDate: Date;
  recordedBy: string;
  createdAt: Date;
}

export interface AuditLog {
  _id?: string;
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface AppSetting {
  _id?: string;
  key: string;
  value: unknown;
  description: string;
  updatedAt: Date;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
