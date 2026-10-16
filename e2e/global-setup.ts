import { MongoMemoryServer } from "mongodb-memory-server";
import { runSeed } from "../scripts/seed";

let mongod: MongoMemoryServer | null = null;

export default async function globalSetup() {
  if (process.env.NODE_ENV === "production" || process.env.MONGODB_URI?.includes("mongodb+srv://")) {
    throw new Error(
      "[E2E Safety Guard] E2E global test setup is strictly forbidden from running against production or remote Atlas environments."
    );
  }

  console.log("[E2E Setup] Starting MongoMemoryServer on port 27017...");
  mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: "bethebest",
    },
  });
  console.log(`[E2E Setup] MongoMemoryServer running at: ${mongod.getUri()}`);
  await runSeed(mongod.getUri(), "bethebest");
  console.log("[E2E Setup] In-memory database seeded successfully.");

  return async () => {
    console.log("[E2E Teardown] Stopping MongoMemoryServer...");
    if (mongod) {
      await mongod.stop();
      console.log("[E2E Teardown] MongoMemoryServer stopped.");
    }
  };
}
