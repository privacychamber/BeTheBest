import { NextRequest, NextResponse } from "next/server";
import { ReviewTopUpSchema } from "@/lib/validations";
import { reviewThursdayTopUp } from "@/lib/dal";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"]);
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
    const message = err instanceof Error ? err.message : "Top-up review failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
