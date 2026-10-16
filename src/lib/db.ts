import { MongoClient, Db, MongoClientOptions } from "mongodb";
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
  AuditLog,
  AppSetting,
} from "@/types";

export function getActiveDbName(): string {
  if (process.env.MONGODB_DB) {
    return process.env.MONGODB_DB;
  }
  // Vercel Preview deployments use isolated preview database
  if (process.env.VERCEL_ENV === "preview") {
    return "bethebest_preview";
  }
  // Production deployment uses dedicated production database
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return "bethebest_prod";
  }
  return "bethebest";
}

const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
};

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing required environment variable: 'MONGODB_URI'. " +
        "Please specify MONGODB_URI in your environment or .env.local file."
    );
  }

  // Safety safeguard: Test execution cannot connect to or modify production database
  const activeDb = getActiveDbName();
  if (process.env.NODE_ENV === "test" && (activeDb === "bethebest_prod" || uri.includes("bethebest_prod"))) {
    throw new Error("SECURITY SAFEGUARD: Test suite is prevented from connecting to or modifying production database 'bethebest_prod'.");
  }

  // Production environment should utilize MongoDB Atlas (mongodb+srv://)
  if (process.env.NODE_ENV === "production" && !uri.startsWith("mongodb+srv://") && !uri.includes("atlas")) {
    console.warn("[MongoDB Security] Production environment should use MongoDB Atlas (mongodb+srv://) for high availability and TLS encryption.");
  }

  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      const client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getDatabase(): Promise<Db> {
  const client = await getMongoClientPromise();
  const activeDbName = getActiveDbName();
  return client.db(activeDbName);
}

// Typed collections helper
export async function getCollections() {
  const db = await getDatabase();
  return {
    users: db.collection<User>("users"),
    profiles: db.collection<Profile>("profiles"),
    opportunities: db.collection<Opportunity>("opportunities"),
    qualifications: db.collection<QualificationAssessment>("qualifications"),
    proposals: db.collection<Proposal>("proposals"),
    budgetPeriods: db.collection<BudgetPeriod>("budget_periods"),
    bidTransactions: db.collection<BidTransaction>("bid_transactions"),
    followUps: db.collection<FollowUp>("follow_ups"),
    clients: db.collection<Client>("clients"),
    contracts: db.collection<Contract>("contracts"),
    handovers: db.collection<ProjectHandover>("project_handovers"),
    finances: db.collection<FinanceRecord>("finances"),
    auditLogs: db.collection<AuditLog>("audit_logs"),
    settings: db.collection<AppSetting>("settings"),
  };
}

/**
 * Health check helper that executes a ping command without leaking credentials.
 */
export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  latencyMs: number;
  database: string;
  error?: string;
}> {
  const start = Date.now();
  const activeDbName = getActiveDbName();
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    const latencyMs = Date.now() - start;
    return {
      ok: true,
      latencyMs,
      database: activeDbName,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : "Unknown database connection error";
    return {
      ok: false,
      latencyMs,
      database: activeDbName,
      error: message,
    };
  }
}

/**
 * Ensures all required indexes exist across collections.
 */
export async function ensureIndexes(): Promise<void> {
  const db = await getDatabase();

  // Users: unique email
  await db.collection("users").createIndex({ email: 1 }, { unique: true });

  // Profiles: platform, status, bidder
  await db.collection("profiles").createIndex({ platform: 1, status: 1 });
  await db.collection("profiles").createIndex({ assignedBidderId: 1 });

  // Opportunities: unique on jobUrl, index on status & assigned
  await db.collection("opportunities").createIndex({ jobUrl: 1 }, { unique: true });
  await db.collection("opportunities").createIndex({ status: 1 });
  await db.collection("opportunities").createIndex({ assignedBidderId: 1, status: 1 });
  await db.collection("opportunities").createIndex({ assignedProfileId: 1 });
  await db.collection("opportunities").createIndex({ createdAt: -1 });

  // Qualifications: unique on opportunityId
  await db.collection("qualifications").createIndex({ opportunityId: 1 }, { unique: true });

  // Proposals: opportunity, profile, bidder, status
  await db.collection("proposals").createIndex({ opportunityId: 1 });
  await db.collection("proposals").createIndex({ profileId: 1 });
  await db.collection("proposals").createIndex({ bidderId: 1 });
  await db.collection("proposals").createIndex({ status: 1, submittedAt: -1 });

  // Budget Periods: compound unique on (weekStartDate, profileId)
  await db.collection("budget_periods").createIndex(
    { weekStartDate: 1, profileId: 1 },
    { unique: true }
  );
  await db.collection("budget_periods").createIndex({ topUpStatus: 1 });

  // Bid Transactions: periodId, profileId, createdAt
  await db.collection("bid_transactions").createIndex({ periodId: 1 });
  await db.collection("bid_transactions").createIndex({ profileId: 1, createdAt: -1 });

  // Follow Ups: assignedTo, scheduledDate, status
  await db.collection("follow_ups").createIndex({ assignedTo: 1, scheduledDate: 1 });
  await db.collection("follow_ups").createIndex({ status: 1, scheduledDate: 1 });
  await db.collection("follow_ups").createIndex({ opportunityId: 1 });

  // Clients: platformClientId
  await db.collection("clients").createIndex({ platformClientId: 1 });

  // Contracts: opportunityId, clientId, status
  await db.collection("contracts").createIndex({ opportunityId: 1 });
  await db.collection("contracts").createIndex({ clientId: 1 });
  await db.collection("contracts").createIndex({ status: 1 });

  // Project Handovers: contractId, coordinatorId
  await db.collection("project_handovers").createIndex({ contractId: 1 });
  await db.collection("project_handovers").createIndex({ coordinatorId: 1, status: 1 });

  // Finances: contractId, type, transactionDate
  await db.collection("finances").createIndex({ contractId: 1 });
  await db.collection("finances").createIndex({ type: 1, transactionDate: -1 });

  // Audit Logs: actorId, entityType, createdAt
  await db.collection("audit_logs").createIndex({ actorId: 1, createdAt: -1 });
  await db.collection("audit_logs").createIndex({ entityType: 1, entityId: 1 });

  // Settings: unique key
  await db.collection("settings").createIndex({ key: 1 }, { unique: true });
}
