import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkDatabaseHealth();

  if (!health.ok) {
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        latencyMs: health.latencyMs,
        error: "Database connectivity check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      status: "healthy",
      database: "connected",
      latencyMs: health.latencyMs,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
