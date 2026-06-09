import { SignJWT, jwtVerify } from "jose";
import type { EmployeePermissions } from "@/lib/adminPermissions";
import { parseEmployeePermissions } from "@/lib/adminPermissions";

export const ADMIN_SESSION_COOKIE = "admin_session";

export interface AdminSessionPayload {
  admin: true;
  login?: string;
  /** Основной админ из ADMIN_LOGIN / ADMIN_PASSWORD в .env */
  isEnvAdmin?: boolean;
  employeeId?: string;
  masterId?: string | null;
  permissions?: EmployeePermissions;
}

function secretBytes(): Uint8Array | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

function parsePermissionsPayload(raw: unknown): EmployeePermissions | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const tabsRaw = (raw as { tabs?: unknown }).tabs;
  if (!tabsRaw || typeof tabsRaw !== "object") return undefined;
  return parseEmployeePermissions(JSON.stringify(raw));
}

export async function signAdminSession(extra?: Omit<AdminSessionPayload, "admin">): Promise<string> {
  const key = secretBytes();
  if (!key) {
    throw new Error("ADMIN_SESSION_SECRET must be set and at least 16 characters");
  }
  return new SignJWT({ admin: true, ...extra })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyAdminSessionToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const key = secretBytes();
    if (!key) return null;
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (payload.admin !== true) return null;
    return {
      admin: true,
      login: typeof payload.login === "string" ? payload.login : undefined,
      isEnvAdmin: payload.isEnvAdmin === true,
      employeeId: typeof payload.employeeId === "string" ? payload.employeeId : undefined,
      masterId:
        typeof payload.masterId === "string" ? payload.masterId : payload.masterId === null ? null : undefined,
      permissions: parsePermissionsPayload(payload.permissions),
    };
  } catch {
    return null;
  }
}

/** @deprecated use verifyAdminSessionToken — returns boolean for middleware */
export async function verifyAdminSessionTokenLegacy(token: string): Promise<boolean> {
  const payload = await verifyAdminSessionToken(token);
  return payload !== null;
}
