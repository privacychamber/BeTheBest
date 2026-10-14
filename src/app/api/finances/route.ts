import { NextRequest, NextResponse } from "next/server";
import { CreateFinanceRecordSchema } from "@/lib/validations";
import { recordFinance, getFinancialSummary } from "@/lib/dal";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth(["ADMIN"]);
    const summary = await getFinancialSummary();
    return NextResponse.json({ success: true, summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load financial summary";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "COORDINATOR"]);
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
    const message = err instanceof Error ? err.message : "Failed to record finance transaction";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
