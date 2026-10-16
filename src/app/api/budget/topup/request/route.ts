import { NextRequest, NextResponse } from "next/server";
import { RequestTopUpSchema } from "@/lib/validations";
import { requestThursdayTopUp } from "@/lib/dal";
import { requireAuth, handleApiError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "BIDDER"], req);
    const body = await req.json();
    const validated = RequestTopUpSchema.parse(body);

    const result = await requestThursdayTopUp(
      validated.periodId,
      validated.requestedAmount,
      validated.reason,
      user
    );

    return NextResponse.json({ success: true, period: result }, { status: 200 });
  } catch (err: unknown) {
    return handleApiError(err, "Top-up request failed");
  }
}
