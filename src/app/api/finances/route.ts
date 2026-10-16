import { NextRequest, NextResponse } from "next/server";
import { CreateFinanceRecordSchema } from "@/lib/validations";
import { recordFinance, getFinancialSummary } from "@/lib/dal";
import { requireAuth, handleApiError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["ADMIN"], req);
    const summary = await getFinancialSummary();
    return NextResponse.json({ success: true, summary });
  } catch (err: unknown) {
    return handleApiError(err, "Failed to load financial summary");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "COORDINATOR"], req);
    const body = await req.json();
    const validated = CreateFinanceRecordSchema.parse(body);

    const record = await recordFinance(
      {
        contractId: validated.contractId,
        type: validated.type,
        amountCents: validated.amountCents,
        currency: validated.currency,
        description: validated.description,
        transactionDate: new Date(validated.transactionDate),
      },
      user
    );

    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (err: unknown) {
    return handleApiError(err, "Failed to record finance transaction");
  }
}
