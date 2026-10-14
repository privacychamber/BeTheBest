import { NextRequest, NextResponse } from "next/server";
import { RequestTopUpSchema } from "@/lib/validations";
import { requestThursdayTopUp } from "@/lib/dal";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "BIDDER"]);
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
    const message = err instanceof Error ? err.message : "Top-up request failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
