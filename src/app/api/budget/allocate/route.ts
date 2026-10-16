import { NextRequest, NextResponse } from "next/server";
import { InitialAllocationSchema } from "@/lib/validations";
import { allocateInitialBudget } from "@/lib/dal";
import { requireAuth, handleApiError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"], req);
    const body = await req.json();
    const validated = InitialAllocationSchema.parse(body);

    const result = await allocateInitialBudget(
      validated.profileId,
      validated.weekStartDate,
      validated.allocationAmount,
      user
    );

    return NextResponse.json({ success: true, period: result }, { status: 200 });
  } catch (err: unknown) {
    return handleApiError(err, "Budget allocation failed");
  }
}
