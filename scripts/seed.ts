import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import {
  INITIAL_ALLOCATION_MAX,
  getMondayOfWeek,
  getSundayOfWeek,
} from "../src/lib/budget";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/bethebest";
const dbName = process.env.MONGODB_DB || "bethebest";

export async function runSeed(overrideUri?: string, overrideDbName?: string) {
  const targetUri = overrideUri || uri;
  const targetDbName = overrideDbName || dbName;

  console.log(`[Seed] Connecting to MongoDB: ${targetUri.replace(/:([^:@]{3,})@/, ":***@")}`);
  const client = new MongoClient(targetUri);
  await client.connect();
  const db = client.db(targetDbName);

  console.log(`[Seed] Ensuring database indexes...`);
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("opportunities").createIndex({ jobUrl: 1 }, { unique: true });
  await db.collection("budget_periods").createIndex({ weekStartDate: 1, profileId: 1 }, { unique: true });

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash("Password123!", salt);

  // 1. Seed Users
  console.log(`[Seed] Upserting initial users...`);
  const adminId = new ObjectId("650000000000000000000001");
  const bidderId = new ObjectId("650000000000000000000002");
  const coordinatorId = new ObjectId("650000000000000000000003");

  await db.collection("users").updateOne(
    { email: "admin@bethebest.com" },
    {
      $set: {
        _id: adminId as unknown as string,
        name: "Devon Vance (Admin & BD Lead)",
        email: "admin@bethebest.com",
        role: "ADMIN",
        passwordHash: defaultPasswordHash,
        isActive: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  await db.collection("users").updateOne(
    { email: "bidder@bethebest.com" },
    {
      $set: {
        _id: bidderId as unknown as string,
        name: "Alex Cross (Bidding Specialist)",
        email: "bidder@bethebest.com",
        role: "BIDDER",
        passwordHash: defaultPasswordHash,
        isActive: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  await db.collection("users").updateOne(
    { email: "coordinator@bethebest.com" },
    {
      $set: {
        _id: coordinatorId as unknown as string,
        name: "Elena Rostova (Project Coordinator)",
        email: "coordinator@bethebest.com",
        role: "COORDINATOR",
        passwordHash: defaultPasswordHash,
        isActive: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // 2. Seed Profiles
  console.log(`[Seed] Upserting bidding profiles...`);
  const profileUpwork1Id = new ObjectId("650000000000000000000011");
  const profileRakeshId = new ObjectId("650000000000000000000012");
  const profileAgencyId = new ObjectId("650000000000000000000013");
  const profileFreelancerId = new ObjectId("650000000000000000000014");

  // Profile 1: Active Upwork Specialist Profile
  await db.collection("profiles").updateOne(
    { _id: profileUpwork1Id as any },
    {
      $set: {
        name: "Alex C. - Full Stack Architect",
        platform: "UPWORK",
        accountType: "INDIVIDUAL",
        assignedBidderId: bidderId.toString(),
        status: "ACTIVE",
        weeklyAllocationCap: 500,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // Profile 2: Rakesh - Special constraint "Review required"
  await db.collection("profiles").updateOne(
    { _id: profileRakeshId as any },
    {
      $set: {
        name: "Rakesh Sharma - AI & Cloud Engineer",
        platform: "UPWORK",
        accountType: "INDIVIDUAL",
        assignedBidderId: bidderId.toString(),
        status: "REVIEW_REQUIRED", // STRICT DIRECTIVE: Review required eligibility state
        reviewNotes: "Profile suspended pending managerial compliance and rate card audit.",
        weeklyAllocationCap: 500,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // Profile 3: Agency Account (Shared Connects Pool)
  await db.collection("profiles").updateOne(
    { _id: profileAgencyId as any },
    {
      $set: {
        name: "BeTheBest Digital Solutions Agency",
        platform: "UPWORK",
        accountType: "AGENCY",
        assignedBidderId: bidderId.toString(),
        status: "ACTIVE",
        sharedAgencyConnectsBalance: 1250,
        weeklyAllocationCap: 500,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // Profile 4: Freelancer.com Account
  await db.collection("profiles").updateOne(
    { _id: profileFreelancerId as any },
    {
      $set: {
        name: "BeTheBest Dev Team",
        platform: "FREELANCER",
        accountType: "AGENCY",
        status: "ACTIVE",
        weeklyAllocationCap: 300,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // 3. Seed Current Week Budget Period for Active Profile
  console.log(`[Seed] Initializing budget allocation for active profile...`);
  const monday = getMondayOfWeek();
  const sunday = getSundayOfWeek();
  const periodId = new ObjectId("650000000000000000000021");

  await db.collection("budget_periods").updateOne(
    { profileId: profileUpwork1Id.toString(), weekStartDate: monday },
    {
      $set: {
        _id: periodId as any,
        weekEndDate: sunday,
        initialAllocation: 300,
        topUpApproved: 0,
        totalAllocation: 300,
        totalSpent: 48,
        remainingBalance: 252,
        topUpStatus: "NONE",
        topUpRequestedAmount: 0,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // 4. Seed Seed Transactions
  await db.collection("bid_transactions").updateOne(
    { periodId: periodId.toString(), type: "INITIAL_ALLOCATION" },
    {
      $set: {
        periodId: periodId.toString(),
        profileId: profileUpwork1Id.toString(),
        bidderId: adminId.toString(),
        type: "INITIAL_ALLOCATION",
        amount: 300,
        balanceAfter: 300,
        note: "Default initial weekly allocation of 300 Connects granted",
        performedBy: adminId.toString(),
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  // 5. Seed Opportunities with qualification assessments
  console.log(`[Seed] Seeding sample opportunities & pipeline...`);
  const opp1Id = new ObjectId("650000000000000000000031");
  const opp2Id = new ObjectId("650000000000000000000032");

  await db.collection("opportunities").updateOne(
    { _id: opp1Id as any },
    {
      $set: {
        title: "Enterprise AI Workflow & Next.js SaaS Platform",
        clientName: "Nexus Ventures Ltd",
        platform: "UPWORK",
        jobUrl: "https://www.upwork.com/jobs/~01abc1234567890def",
        platformJobId: "~01abc1234567890def",
        budgetType: "FIXED",
        budgetAmountCents: 1500000, // $15,000.00
        status: "QUALIFIED",
        assignedBidderId: bidderId.toString(),
        assignedProfileId: profileUpwork1Id.toString(),
        score: 88,
        qualificationNotes: "Client verified with $45k spend and 80% hire rate. Perfect tech stack match.",
        tags: ["Next.js", "AI", "MongoDB", "High Budget"],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  await db.collection("qualifications").updateOne(
    { opportunityId: opp1Id.toString() },
    {
      $set: {
        opportunityId: opp1Id.toString(),
        clientPaymentVerified: true,
        clientSpendCents: 4500000,
        clientHireRatePercent: 80,
        budgetFitScore: 20,
        skillsMatchScore: 20,
        proposalCompetitionScore: 12,
        hardStopTriggered: false,
        totalScore: 88,
        passed: true,
        evaluatedBy: bidderId.toString(),
        evaluatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  await db.collection("opportunities").updateOne(
    { _id: opp2Id as any },
    {
      $set: {
        title: "Low Budget Bug Fix with Unverified Client",
        clientName: "Unknown Client",
        platform: "UPWORK",
        jobUrl: "https://www.upwork.com/jobs/~01xyz9876543210abc",
        platformJobId: "~01xyz9876543210abc",
        budgetType: "FIXED",
        budgetAmountCents: 5000, // $50.00
        status: "DISQUALIFIED",
        score: 0,
        qualificationNotes: "Disqualified via hard-stop: unverified payment and budget below $200 agency floor.",
        hardStopReason: "Fixed budget of $50.00 is below minimum agency threshold ($200.00)",
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  console.log(`[Seed] Seed process completed successfully!`);
  await client.close();
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith("seed.ts")) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Seed] Error executing seed:", err);
      process.exit(1);
    });
}
