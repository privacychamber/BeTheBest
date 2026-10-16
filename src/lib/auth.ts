import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getCollections } from "./db";
import { UserRole, SessionUser } from "@/types";

import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "bethebest_session";

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export function getEncodedSecret(): Uint8Array {
  const secretKey = process.env.AUTH_SECRET;
  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL SECURITY ERROR: Missing 'AUTH_SECRET' environment variable in production.");
    }
    return new TextEncoder().encode("fallback_default_secret_for_local_testing_at_least_32_characters");
  }
  if (secretKey.length < 32 && process.env.NODE_ENV === "production") {
    throw new Error("CRITICAL SECURITY ERROR: 'AUTH_SECRET' must be at least 32 characters in production.");
  }
  return new TextEncoder().encode(secretKey);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getEncodedSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getEncodedSecret());
    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(req?: NextRequest): Promise<SessionUser | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    } catch {
      // Called outside Next.js request scope, treat as unauthenticated
      return null;
    }
  }

  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAuth(allowedRoles?: UserRole[], req?: NextRequest): Promise<SessionUser> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new AuthError("Unauthorized: Authentication required.", 401);
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new AuthError(`Forbidden: Role '${user.role}' is not authorized for this operation.`, 403);
  }

  return user;
}

export function handleApiError(err: unknown, defaultMessage: string = "Request failed") {
  if (err instanceof AuthError) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
  }
  const message = err instanceof Error ? err.message : defaultMessage;
  if (message.startsWith("Unauthorized")) {
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
  if (message.startsWith("Forbidden")) {
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function authenticateCredentials(
  email: string,
  passwordPlain: string
): Promise<SessionUser> {
  const { users } = await getCollections();
  const user = await users.findOne({ email: email.toLowerCase().trim() });

  if (!user || !user.isActive) {
    throw new Error("Invalid credentials or account inactive");
  }

  const isValid = await comparePassword(passwordPlain, user.passwordHash);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  return {
    id: user._id!.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
