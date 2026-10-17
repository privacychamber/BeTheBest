import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface ProvisionAdminOptions {
  email: string;
  name: string;
  password?: string;
  uri?: string;
  dbName?: string;
}

export async function provisionAdminUser(options: ProvisionAdminOptions): Promise<{
  success: boolean;
  userId: string;
  email: string;
  generatedPassword?: string;
  message: string;
}> {
  const email = options.email.toLowerCase().trim();
  const name = options.name.trim();
  const targetUri = options.uri || process.env.MONGODB_URI;
  const targetDbName =
    options.dbName ||
    process.env.MONGODB_DB ||
    (process.env.NODE_ENV === "production" ? "bethebest_prod" : "bethebest");

  if (!targetUri) {
    throw new Error("MONGODB_URI environment variable or --uri parameter is required.");
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
        isUpdate: !!existing,
      },
      createdAt: new Date(),
    });

    return {
      success: true,
      userId,
      email,
      generatedPassword: generated ? plainPassword : undefined,
      message: existing
        ? `Successfully updated and promoted user '${email}' to active ADMIN.`
        : `Successfully provisioned new active ADMIN user '${email}'.`,
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

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      email = args[++i];
    } else if (args[i] === "--name" && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === "--password" && args[i + 1]) {
      password = args[++i];
    }
  }

  if (!email || !name) {
    console.error("Usage: npm run admin:create -- --email <email> --name <name> [--password <password>]");
    console.error("Alternatively set ADMIN_EMAIL, ADMIN_NAME, and optional ADMIN_PASSWORD environment variables.");
    process.exit(1);
  }

  provisionAdminUser({ email, name, password })
    .then((result) => {
      console.log(`[Admin Provisioning] ${result.message}`);
      console.log(`[Admin Provisioning] User ID: ${result.userId}`);
      if (result.generatedPassword) {
        console.log(`[Admin Provisioning] Generated Temporary Password: ${result.generatedPassword}`);
        console.log("[Admin Provisioning] Please securely record this password and change it after initial login.");
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Admin Provisioning Error]", err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
