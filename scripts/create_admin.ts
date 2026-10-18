import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface ProvisionAdminOptions {
  email: string;
  name: string;
  password?: string;
  uri?: string;
  dbName?: string;
  targetEnv?: "preview" | "production" | "development";
}

export function resolveTargetDbName(options?: ProvisionAdminOptions): string {
  if (options?.dbName) {
    return options.dbName;
  }
  if (process.env.MONGODB_DB) {
    return process.env.MONGODB_DB;
  }
  if (
    options?.targetEnv === "preview" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.APP_ENV === "preview" ||
    process.env.TARGET_ENV === "preview"
  ) {
    return "bethebest_preview";
  }
  if (
    options?.targetEnv === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return "bethebest_prod";
  }
  return "bethebest";
}

export async function provisionAdminUser(options: ProvisionAdminOptions): Promise<{
  success: boolean;
  userId: string;
  email: string;
  targetDb: string;
  generatedPassword?: string;
  message: string;
}> {
  const email = options.email.toLowerCase().trim();
  const name = options.name.trim();
  const targetUri = options.uri || process.env.MONGODB_URI;
  const targetDbName = resolveTargetDbName(options);

  if (!targetUri) {
    throw new Error("MONGODB_URI environment variable or options.uri parameter is required.");
  }

  // Safety safeguard: Never touch bethebest_prod if targetEnv is preview
  if (
    (options.targetEnv === "preview" || process.env.VERCEL_ENV === "preview") &&
    (targetDbName === "bethebest_prod" || targetUri.includes("bethebest_prod"))
  ) {
    throw new Error("SECURITY SAFEGUARD: Provisioning script targeting Preview is strictly prevented from touching 'bethebest_prod'.");
  }

  if (!email || !email.includes("@")) {
    throw new Error("A valid email address is required.");
  }

  if (!name) {
    throw new Error("A full name is required for admin provisioning.");
  }

  let plainPassword = options.password;
  let generated = false;

  if (!plainPassword) {
    // Generate a cryptographically secure random password if none was supplied
    plainPassword = crypto.randomBytes(18).toString("base64url") + "!A1";
    generated = true;
  } else if (plainPassword.length < 8) {
    throw new Error("Admin password must be at least 8 characters long.");
  }

  const client = new MongoClient(targetUri);
  try {
    await client.connect();
    const db = client.db(targetDbName);

    // Ensure users index on email exists
    await db.collection("users").createIndex({ email: 1 }, { unique: true });

    const existing = await db.collection("users").findOne({ email });
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    let userId: string;

    if (existing) {
      await db.collection("users").updateOne(
        { email },
        {
          $set: {
            name,
            role: "ADMIN",
            passwordHash,
            isActive: true,
            updatedAt: new Date(),
          },
        }
      );
      userId = existing._id.toString();
    } else {
      const newId = new ObjectId();
      await db.collection("users").insertOne({
        _id: newId as unknown as any,
        email,
        name,
        role: "ADMIN",
        passwordHash,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      userId = newId.toString();
    }

    // Record audit event
    await db.collection("audit_logs").insertOne({
      actorId: userId,
      actorEmail: email,
      action: "PROVISION_ADMIN_USER",
      entityType: "user",
      entityId: userId,
      details: {
        email,
        name,
        role: "ADMIN",
        targetDatabase: targetDbName,
        isUpdate: !!existing,
      },
      createdAt: new Date(),
    });

    return {
      success: true,
      userId,
      email,
      targetDb: targetDbName,
      generatedPassword: generated ? plainPassword : undefined,
      message: existing
        ? `Successfully updated and promoted user '${email}' to active ADMIN in database '${targetDbName}'.`
        : `Successfully provisioned new active ADMIN user '${email}' in database '${targetDbName}'.`,
    };
  } finally {
    await client.close();
  }
}

// CLI Execution entrypoint
if (process.argv[1]?.endsWith("create_admin.ts")) {
  const args = process.argv.slice(2);
  let email = process.env.ADMIN_EMAIL || "";
  let name = process.env.ADMIN_NAME || "";
  let password = process.env.ADMIN_PASSWORD || "";
  let dbName = process.env.MONGODB_DB || "";
  let uri = process.env.MONGODB_URI || "";
  let targetEnv: "preview" | "production" | "development" | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      email = args[++i];
    } else if (args[i] === "--name" && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === "--db" && args[i + 1]) {
      dbName = args[++i];
    } else if (args[i] === "--uri" && args[i + 1]) {
      uri = args[++i];
    } else if (args[i] === "--preview") {
      targetEnv = "preview";
      dbName = "bethebest_preview";
    } else if (args[i] === "--password") {
      console.error(
        "[Security Violation] Passing passwords as command-line arguments is strictly prohibited (exposed in process listings and history)."
      );
      console.error(
        "Please provide the password via the ADMIN_PASSWORD environment variable, or omit it to auto-generate a secure random credential."
      );
      process.exit(1);
    }
  }

  if (!email || !name) {
    console.error("Usage: npm run admin:create -- --email <email> --name <name> [--preview] [--db <dbname>]");
    console.error("Note: Passwords must NOT be passed as CLI arguments. Use ADMIN_PASSWORD env var or let the script auto-generate.");
    process.exit(1);
  }

  provisionAdminUser({ email, name, password, dbName, uri, targetEnv })
    .then((result) => {
      console.log(`[Admin Provisioning] ${result.message}`);
      console.log(`[Admin Provisioning] Target Database: ${result.targetDb}`);
      console.log(`[Admin Provisioning] User ID: ${result.userId}`);

      if (result.generatedPassword) {
        // Securely write credential to a restricted file instead of leaking in stdout/CI logs
        const credPath = path.join(process.cwd(), ".admin-credential.json");
        const credData = JSON.stringify(
          {
            email: result.email,
            database: result.targetDb,
            password: result.generatedPassword,
            generatedAt: new Date().toISOString(),
          },
          null,
          2
        );
        fs.writeFileSync(credPath, credData, { mode: 0o600 });
        console.log(`[Admin Provisioning] Temporary credential securely saved to: ${credPath}`);
        console.log("[Admin Provisioning] File is restricted and excluded from git. Rotate password upon initial sign-in.");
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Admin Provisioning Error]", err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
