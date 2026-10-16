import { NextRequest, NextResponse } from "next/server";
import { ReviewTopUpSchema } from "@/lib/validations";
import { reviewThursdayTopUp } from "@/lib/dal";
import { requireAuth, handleApiError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"], req);
    const body = await req.json();
    const validated = ReviewTopUpSchema.parse(body);

    const result = await reviewThursdayTopUp(
      validated.periodId,
      validated.decision,
      user,
      validated.notes
    );

    return NextResponse.json({ success: true, period: result }, { status: 200 });
  } catch (err: unknown) {
    return handleApiError(err, "Top-up review failed");
  }
}
