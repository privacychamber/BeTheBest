import { NextRequest, NextResponse } from "next/server";
import { CreateFollowUpSchema } from "@/lib/validations";
import { listFollowUps, createFollowUp } from "@/lib/dal";
import { requireAuth, handleApiError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(undefined, req);
    const { searchParams } = new URL(req.url);
    const assignedTo = searchParams.get("assignedTo");
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (assignedTo) filter.assignedTo = assignedTo;
    if (status) filter.status = status;

    const followUps = await listFollowUps(filter);
    return NextResponse.json({ success: true, followUps });
  } catch (err: unknown) {
    return handleApiError(err, "Failed to load follow-ups");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(undefined, req);
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
    return handleApiError(err, "Failed to schedule follow-up");
  }
}
