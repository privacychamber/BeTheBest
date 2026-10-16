import { NextRequest, NextResponse } from "next/server";
import { ProfileClearanceSchema } from "@/lib/validations";
import { clearProfileReview } from "@/lib/dal";
import { requireAuth, handleApiError } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN"], req);
    const { id } = await params;
    const body = await req.json();

    const validated = ProfileClearanceSchema.parse({
      ...body,
      profileId: id,
    });

    const result = await clearProfileReview(
      id,
      user,
      validated.notes,
      validated.targetStatus
    );

    return NextResponse.json({ success: true, profile: result });
  } catch (err: unknown) {
    return handleApiError(err, "Profile clearance failed");
  }
}
