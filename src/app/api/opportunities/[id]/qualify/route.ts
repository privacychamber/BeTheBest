import { NextRequest, NextResponse } from "next/server";
import { QualificationSchema } from "@/lib/validations";
import { qualifyOpportunity } from "@/lib/dal";
import { requireAuth, handleApiError } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "BIDDER"], req);
    const { id } = await params;
    const body = await req.json();

    const validated = QualificationSchema.parse({
      ...body,
      opportunityId: id,
    });

    const result = await qualifyOpportunity(validated, user);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    return handleApiError(err, "Qualification assessment failed");
  }
}
