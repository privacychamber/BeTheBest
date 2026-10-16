import { NextRequest, NextResponse } from "next/server";
import { CreateProposalSchema } from "@/lib/validations";
import { createProposal } from "@/lib/dal";
import { requireAuth, handleApiError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "BIDDER"], req);
    const body = await req.json();
    const validated = CreateProposalSchema.parse(body);

    const proposal = await createProposal(validated, user);
    return NextResponse.json({ success: true, proposal }, { status: 201 });
  } catch (err: unknown) {
    return handleApiError(err, "Proposal submission failed");
  }
}
