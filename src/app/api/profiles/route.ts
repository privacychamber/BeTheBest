import { NextRequest, NextResponse } from "next/server";
import { CreateProfileSchema } from "@/lib/validations";
import { listProfiles, createProfile } from "@/lib/dal";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();
    const profiles = await listProfiles();
    return NextResponse.json({ success: true, profiles });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load profiles";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const body = await req.json();
    const validated = CreateProfileSchema.parse(body);

    const profile = await createProfile(validated, user);
    return NextResponse.json({ success: true, profile }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create profile";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
