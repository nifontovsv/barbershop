import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE = "admin_session";

function secretBytes(): Uint8Array | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

export async function signAdminSession(): Promise<string> {
  const key = secretBytes();
  if (!key) {
    throw new Error("ADMIN_SESSION_SECRET must be set and at least 16 characters");
  }
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  try {
    const key = secretBytes();
    if (!key) return false;
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload.admin === true;
  } catch {
    return false;
  }
}
