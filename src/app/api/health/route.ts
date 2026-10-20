import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkDatabaseHealth();

  if (!health.ok) {
    console.error("[Health Check Failed]", {
      database: health.database,
      latencyMs: health.latencyMs,
      error: health.error,
    });
    const sanitizedDetail = (health.error || "Unknown connection error").replace(/:([^@]+)@/g, ":***@");
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        databaseName: health.database,
        latencyMs: health.latencyMs,
        error: "Database connectivity check failed",
        detail: sanitizedDetail,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      status: "healthy",
      database: "connected",
      databaseName: health.database,
      latencyMs: health.latencyMs,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
