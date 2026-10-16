import { NextRequest, NextResponse } from "next/server";
import { CreateHandoverSchema } from "@/lib/validations";
import { createProjectHandover } from "@/lib/dal";
import { getCollections } from "@/lib/db";
import { requireAuth, handleApiError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["ADMIN", "COORDINATOR"], req);
    const { handovers } = await getCollections();
    const list = await handovers.find().sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, handovers: list });
  } catch (err: unknown) {
    return handleApiError(err, "Failed to load project handovers");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "COORDINATOR"], req);
    const body = await req.json();
    const validated = CreateHandoverSchema.parse(body);

    const handover = await createProjectHandover(validated, user);
    return NextResponse.json({ success: true, handover }, { status: 201 });
  } catch (err: unknown) {
    return handleApiError(err, "Failed to create project handover");
  }
}
