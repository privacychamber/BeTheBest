import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@/lib/validations";
import { authenticateCredentials, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = LoginSchema.parse(body);

    const user = await authenticateCredentials(validated.email, validated.password);
    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 401 }
    );
  }
}
