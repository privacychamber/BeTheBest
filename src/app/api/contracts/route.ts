import { NextRequest, NextResponse } from "next/server";
import { CreateContractSchema } from "@/lib/validations";
import { createContractFromWonOpportunity } from "@/lib/dal";
import { getCollections } from "@/lib/db";
import { requireAuth, handleApiError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["ADMIN", "COORDINATOR"], req);
    const { contracts } = await getCollections();
    const list = await contracts.find().sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, contracts: list });
  } catch (err: unknown) {
    return handleApiError(err, "Failed to load contracts");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "COORDINATOR"], req);
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
    return handleApiError(err, "Failed to create contract");
  }
}
