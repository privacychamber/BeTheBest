import { NextRequest, NextResponse } from "next/server";
import { CreateContractSchema } from "@/lib/validations";
import { createContractFromWonOpportunity } from "@/lib/dal";
import { getCollections } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth(["ADMIN", "COORDINATOR"]);
    const { contracts } = await getCollections();
    const list = await contracts.find().sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, contracts: list });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load contracts";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "COORDINATOR"]);
    const body = await req.json();
    const validated = CreateContractSchema.parse(body);

    const { opportunities, profiles } = await getCollections();
    const opp = await opportunities.findOne({ _id: validated.opportunityId as unknown as any });
    const profile = await profiles.findOne({ _id: validated.profileId as unknown as any });

    const contract = await createContractFromWonOpportunity(
      {
        opportunityId: validated.opportunityId,
        clientName: opp?.clientName || "Direct Client",
        platform: opp?.platform || "UPWORK",
        platformClientId: validated.clientId,
        profileId: validated.profileId,
        title: validated.title,
        contractType: validated.contractType,
        totalValueCents: validated.totalValueCents,
        hourlyRateCents: validated.hourlyRateCents,
        startDate: new Date(validated.startDate),
      },
      user
    );

    return NextResponse.json({ success: true, contract }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create contract";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
