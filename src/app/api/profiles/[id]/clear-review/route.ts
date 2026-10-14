import { NextRequest, NextResponse } from "next/server";
import { ProfileClearanceSchema } from "@/lib/validations";
import { clearProfileReview } from "@/lib/dal";
import { requireAuth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN"]);
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
    const message = err instanceof Error ? err.message : "Profile clearance failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
