import { NextRequest, NextResponse } from "next/server";
import { CreateFollowUpSchema } from "@/lib/validations";
import { listFollowUps, createFollowUp } from "@/lib/dal";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const assignedTo = searchParams.get("assignedTo");
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (assignedTo) filter.assignedTo = assignedTo;
    if (status) filter.status = status;

    const followUps = await listFollowUps(filter);
    return NextResponse.json({ success: true, followUps });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load follow-ups";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const validated = CreateFollowUpSchema.parse(body);

    const followUp = await createFollowUp(
      {
        opportunityId: validated.opportunityId,
        proposalId: validated.proposalId,
        assignedTo: validated.assignedTo,
        scheduledDate: new Date(validated.scheduledDate),
        notes: validated.notes,
      },
      user
    );

    return NextResponse.json({ success: true, followUp }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to schedule follow-up";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
