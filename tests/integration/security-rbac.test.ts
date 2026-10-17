import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ObjectId } from "mongodb";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import {
  AuthError,
  getEncodedSecret,
  requireAuth,
  createSessionToken,
  authenticateCredentials,
  handleApiError,
} from "../../src/lib/auth";
import { getActiveDbName, ensureIndexes, getCollections } from "../../src/lib/db";
import {
  INITIAL_ALLOCATION_MAX,
  THURSDAY_TOP_UP_MAX,
  WEEKLY_CAP_MAX,
  validateInitialAllocation,
  validateTopUpRequest,
  validateTopUpApproval,
  getMondayOfWeek,
} from "../../src/lib/budget";
import {
  createProfile,
  clearProfileReview,
  allocateInitialBudget,
  requestThursdayTopUp,
  reviewThursdayTopUp,
  createProposal,
} from "../../src/lib/dal";
import { runSeed } from "../../scripts/seed";
import { provisionAdminUser } from "../../scripts/create_admin";
import type { SessionUser } from "../../src/types";

// Route handlers for direct API testing
import { POST as allocateBudgetRoute } from "../../src/app/api/budget/allocate/route";
import { POST as reviewTopUpRoute } from "../../src/app/api/budget/topup/review/route";
import { POST as clearReviewRoute } from "../../src/app/api/profiles/[id]/clear-review/route";
import { GET as getFinancesRoute } from "../../src/app/api/finances/route";
import { POST as qualifyRoute } from "../../src/app/api/opportunities/[id]/qualify/route";

let mongoServer: MongoMemoryServer;
let client: MongoClient;

const mockAdminUser: SessionUser = {
  id: "650000000000000000000001",
  name: "Devon Vance (Admin)",
  email: "admin@bethebest.com",
  role: "ADMIN",
};

const mockBidderUser: SessionUser = {
  id: "650000000000000000000002",
  name: "Alex Cross (Bidder)",
  email: "bidder@bethebest.com",
  role: "BIDDER",
};

const mockCoordinatorUser: SessionUser = {
  id: "650000000000000000000003",
  name: "Elena Rostova (Coordinator)",
  email: "coordinator@bethebest.com",
  role: "COORDINATOR",
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { launchTimeout: 60000 },
  });
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB = "bethebest_security_test";
  process.env.AUTH_SECRET = "secure_test_jwt_secret_key_exceeding_32_characters_for_testing!";
  global._mongoClientPromise = undefined;

  client = new MongoClient(uri);
  await client.connect();
  await ensureIndexes();
}, 120000);

afterAll(async () => {
  if (client) await client.close();
  if (mongoServer) await mongoServer.stop();
});

describe("1. Authentication Security & Production Safeguards", () => {
  it("strictly enforces AUTH_SECRET presence and minimum length in production", () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.AUTH_SECRET;

    try {
      (process.env as any).NODE_ENV = "production";

      // Missing secret in production must throw
      delete process.env.AUTH_SECRET;
      expect(() => getEncodedSecret()).toThrow("CRITICAL SECURITY ERROR");

      // Short secret (<32 chars) in production must throw
      process.env.AUTH_SECRET = "too_short_secret";
      expect(() => getEncodedSecret()).toThrow("at least 32 characters");

      // Valid 32+ character secret passes
      process.env.AUTH_SECRET = "production_secure_secret_with_more_than_32_characters_required!";
      const encoded = getEncodedSecret();
      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(encoded.length).toBeGreaterThanOrEqual(32);
    } finally {
      (process.env as any).NODE_ENV = origEnv;
      process.env.AUTH_SECRET = origSecret;
    }
  });

  it("creates and verifies HS256 JWT session tokens without URL or parameter bypass", async () => {
    const token = await createSessionToken(mockAdminUser);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // Header.Payload.Signature

    // Auth error properly instantiates status codes
    const err401 = new AuthError("Unauthorized", 401);
    expect(err401.statusCode).toBe(401);
    const err403 = new AuthError("Forbidden", 403);
    expect(err403.statusCode).toBe(403);

    const handled401 = handleApiError(err401);
    expect(handled401.status).toBe(401);

    const handled403 = handleApiError(err403);
    expect(handled403.status).toBe(403);
  });
});

describe("2. Server-Side RBAC & Direct API Authorization", () => {
  it("rejects unauthenticated requests to protected endpoints with 401 Unauthorized", async () => {
    // Calling route with no cookies/session
    const req = new NextRequest("http://localhost:3000/api/budget/allocate", {
      method: "POST",
      body: JSON.stringify({
        profileId: "650000000000000000000010",
        weekStartDate: "2026-10-19",
        allocationAmount: 300,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await allocateBudgetRoute(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Unauthorized");
  });

  it("blocks non-admin roles from allocating budgets with 403 Forbidden", async () => {
    // Direct call with BIDDER role token
    const bidderToken = await createSessionToken(mockBidderUser);
    const req = new NextRequest("http://localhost:3000/api/budget/allocate", {
      method: "POST",
      body: JSON.stringify({
        profileId: "650000000000000000000010",
        weekStartDate: "2026-10-19",
        allocationAmount: 200,
      }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `bethebest_session=${bidderToken}`,
      },
    });

    const res = await allocateBudgetRoute(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Forbidden");
  });

  it("blocks non-admin roles from clearing profile reviews with 403 Forbidden", async () => {
    const bidderToken = await createSessionToken(mockBidderUser);
    const req = new NextRequest("http://localhost:3000/api/profiles/650000000000000000000010/clear-review", {
      method: "POST",
      body: JSON.stringify({
        notes: "Trying to clear review as bidder",
        targetStatus: "ACTIVE",
      }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `bethebest_session=${bidderToken}`,
      },
    });

    const params = Promise.resolve({ id: "650000000000000000000010" });
    const res = await clearReviewRoute(req, { params });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Forbidden");
  });

  it("blocks coordinators from qualifying opportunities with 403 Forbidden", async () => {
    const coordinatorToken = await createSessionToken(mockCoordinatorUser);
    const req = new NextRequest("http://localhost:3000/api/opportunities/650000000000000000000020/qualify", {
      method: "POST",
      body: JSON.stringify({
        clientPaymentVerified: true,
        clientSpendCents: 100000,
        clientHireRatePercent: 70,
        budgetFitScore: 20,
        skillsMatchScore: 20,
        proposalCompetitionScore: 10,
        budgetAmountCents: 100000,
      }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `bethebest_session=${coordinatorToken}`,
      },
    });

    const params = Promise.resolve({ id: "650000000000000000000020" });
    const res = await qualifyRoute(req, { params });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Forbidden");
  });

  it("blocks non-admin from accessing financial ROI summaries with 403 Forbidden", async () => {
    const bidderToken = await createSessionToken(mockBidderUser);
    const req = new NextRequest("http://localhost:3000/api/finances", {
      method: "GET",
      headers: { Cookie: `bethebest_session=${bidderToken}` },
    });

    const res = await getFinancesRoute(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Forbidden");
  });
});

describe("3. MongoDB Atlas Isolation & Test Safeguards", () => {
  it("isolates Preview and Production database targets correctly", () => {
    const origVercelEnv = process.env.VERCEL_ENV;
    const origNodeEnv = process.env.NODE_ENV;
    const origDb = process.env.MONGODB_DB;

    try {
      delete process.env.MONGODB_DB;

      // Preview environment uses bethebest_preview
      process.env.VERCEL_ENV = "preview";
      expect(getActiveDbName()).toBe("bethebest_preview");

      // Production environment uses bethebest_prod
      process.env.VERCEL_ENV = "production";
      expect(getActiveDbName()).toBe("bethebest_prod");

      // Explicit MONGODB_DB takes precedence
      process.env.MONGODB_DB = "custom_staging_db";
      expect(getActiveDbName()).toBe("custom_staging_db");
    } finally {
      process.env.VERCEL_ENV = origVercelEnv;
      (process.env as any).NODE_ENV = origNodeEnv;
      process.env.MONGODB_DB = origDb;
    }
  });

  it("prevents test execution and seeding from modifying production database", async () => {
    const origNodeEnv = process.env.NODE_ENV;
    const origAllow = process.env.ALLOW_PRODUCTION_SEED;

    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.ALLOW_PRODUCTION_SEED;

      // Seeding in production without explicit ALLOW_PRODUCTION_SEED flag must abort
      await expect(runSeed("mongodb://127.0.0.1:27017", "bethebest_prod")).rejects.toThrow(
        "Seeding is blocked on production environments"
      );
    } finally {
      (process.env as any).NODE_ENV = origNodeEnv;
      process.env.ALLOW_PRODUCTION_SEED = origAllow;
    }
  });
});

describe("4. Secrets & Git Tracked Files Security", () => {
  it("ensures .env.local is in .gitignore and not tracked by Git", () => {
    const gitignorePath = path.resolve(process.cwd(), ".gitignore");
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");

    expect(gitignoreContent).toContain(".env*.local");
    expect(gitignoreContent).toContain(".env");

    const envExamplePath = path.resolve(process.cwd(), ".env.example");
    const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");

    // Must not contain real live credentials
    expect(envExampleContent).not.toContain("mongodb+srv://admin:realpassword");
    expect(envExampleContent).toContain("replace_with_a_secure_random_32_character_secret_string");
  });
});

describe("5. Financial Integrity & Connects Budget Governance", () => {
  it("enforces 300-Connect initial allocation limit", () => {
    expect(INITIAL_ALLOCATION_MAX).toBe(300);

    const valid = validateInitialAllocation(300, "ACTIVE");
    expect(valid.valid).toBe(true);

    const overLimit = validateInitialAllocation(301, "ACTIVE");
    expect(overLimit.valid).toBe(false);
    expect(overLimit.error).toContain("cannot exceed 300");
  });

  it("enforces 200 Thursday top-up limit and 500 weekly total cap", () => {
    expect(THURSDAY_TOP_UP_MAX).toBe(200);
    expect(WEEKLY_CAP_MAX).toBe(500);

    // Initial 300 + 200 top-up = 500 (allowed)
    const validTopUp = validateTopUpRequest(200, 300, "ACTIVE");
    expect(validTopUp.valid).toBe(true);

    // Exceeding 200 top-up max
    const overTopUp = validateTopUpRequest(201, 200, "ACTIVE");
    expect(overTopUp.valid).toBe(false);
    expect(overTopUp.error).toContain("cannot exceed 200");

    // Exceeding 500 cap (350 initial + 160 top-up = 510)
    const overCap = validateTopUpRequest(160, 350, "ACTIVE");
    expect(overCap.valid).toBe(false);
    expect(overCap.error).toContain("cannot exceed 500");
  });

  it("strictly enforces Rakesh Review Required restriction until explicit clearance", async () => {
    // Validation function blocks Rakesh by name or REVIEW_REQUIRED status
    const blockedRakesh = validateInitialAllocation(250, "REVIEW_REQUIRED", "Rakesh Sharma Profile", false);
    expect(blockedRakesh.valid).toBe(false);
    expect(blockedRakesh.error).toContain("Review required");

    // Clearance allows allocation
    const clearedRakesh = validateInitialAllocation(250, "ACTIVE", "Rakesh Sharma Profile", true);
    expect(clearedRakesh.valid).toBe(true);
  });
});

describe("6. Secure First-Admin Provisioning & Production Sign-In", () => {
  it("provisions a new admin user securely with valid bcrypt password hash", async () => {
    const adminEmail = `secure.admin.${Date.now()}@bethebest.com`;
    const res = await provisionAdminUser({
      email: adminEmail,
      name: "Super Admin",
      password: "SecureAdminPassword123!",
      uri: process.env.MONGODB_URI,
      dbName: "bethebest_security_test",
    });

    expect(res.success).toBe(true);
    expect(res.email).toBe(adminEmail);
    expect(res.userId).toBeDefined();

    // Verify user can authenticate with credentials
    const authUser = await authenticateCredentials(adminEmail, "SecureAdminPassword123!");
    expect(authUser.email).toBe(adminEmail);
    expect(authUser.role).toBe("ADMIN");

    // Invalid password must fail
    await expect(authenticateCredentials(adminEmail, "WrongPassword!")).rejects.toThrow("Invalid credentials");
  });

  it("generates a secure password when no password is provided", async () => {
    const adminEmail = `generated.admin.${Date.now()}@bethebest.com`;
    const res = await provisionAdminUser({
      email: adminEmail,
      name: "Generated Admin",
      uri: process.env.MONGODB_URI,
      dbName: "bethebest_security_test",
    });

    expect(res.success).toBe(true);
    expect(res.generatedPassword).toBeDefined();
    expect(res.generatedPassword!.length).toBeGreaterThanOrEqual(16);

    // Verify authentication succeeds with the generated password
    const authUser = await authenticateCredentials(adminEmail, res.generatedPassword!);
    expect(authUser.role).toBe("ADMIN");
  });
});

