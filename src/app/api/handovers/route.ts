import { NextRequest, NextResponse } from "next/server";
import { CreateHandoverSchema } from "@/lib/validations";
import { createProjectHandover } from "@/lib/dal";
import { getCollections } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth(["ADMIN", "COORDINATOR"]);
    const { handovers } = await getCollections();
    const list = await handovers.find().sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, handovers: list });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load project handovers";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "COORDINATOR"]);
    const body = await req.json();
    const validated = CreateHandoverSchema.parse(body);

    const handover = await createProjectHandover(validated, user);
    return NextResponse.json({ success: true, handover }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create project handover";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
