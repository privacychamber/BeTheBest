import { NextRequest, NextResponse } from "next/server";
import { CreateProfileSchema } from "@/lib/validations";
import { listProfiles, createProfile } from "@/lib/dal";
import { requireAuth, handleApiError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(undefined, req);
    const profiles = await listProfiles();
    return NextResponse.json({ success: true, profiles });
  } catch (err: unknown) {
    return handleApiError(err, "Failed to load profiles");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"], req);
    const body = await req.json();
    const validated = CreateProfileSchema.parse(body);

    const profile = await createProfile(validated, user);
    return NextResponse.json({ success: true, profile }, { status: 201 });
  } catch (err: unknown) {
    return handleApiError(err, "Failed to create profile");
  }
}
