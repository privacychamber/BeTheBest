import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getCollections } from "./db";
import { UserRole, SessionUser } from "@/types";

const COOKIE_NAME = "bethebest_session";
const secretKey = process.env.AUTH_SECRET || "fallback_default_secret_for_local_testing_at_least_32_characters";
const encodedSecret = new TextEncoder().encode(secretKey);

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
    .sign(encodedSecret);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
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

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAuth(allowedRoles?: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Authentication required.");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new Error(`Forbidden: Role '${user.role}' is not authorized for this operation.`);
  }

  return user;
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
