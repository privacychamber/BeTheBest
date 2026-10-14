import { NextRequest, NextResponse } from "next/server";
import { QuickAddJobSchema } from "@/lib/validations";
import { createOpportunity, listOpportunities } from "@/lib/dal";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const bidderId = searchParams.get("bidderId");

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (platform) filter.platform = platform;
    if (bidderId) filter.assignedBidderId = bidderId;

    const data = await listOpportunities(filter, page, limit);
    return NextResponse.json({ success: true, ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch opportunities";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "BIDDER"]);
    const body = await req.json();
    const validated = QuickAddJobSchema.parse(body);

    const opportunity = await createOpportunity(validated, user);
    return NextResponse.json({ success: true, opportunity }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create opportunity";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
