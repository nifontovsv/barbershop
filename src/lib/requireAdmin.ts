import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
  type AdminSessionPayload,
} from "@/lib/adminJwt";
import {
  canAccessTab,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  type AdminPermissionTab,
  type EmployeePermissions,
} from "@/lib/adminPermissions";
import { getEmployeePermissionsById } from "@/lib/db";

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const c = await cookies();
  const t = c.get(ADMIN_SESSION_COOKIE)?.value;
  if (!t) return null;
  return verifyAdminSessionToken(t);
}

/** Основной администратор из .env */
export function isEnvAdmin(session: AdminSessionPayload): boolean {
  return session.isEnvAdmin === true;
}

/** @deprecated используйте isEnvAdmin */
export function isFullAdmin(session: AdminSessionPayload): boolean {
  return isEnvAdmin(session);
}

export function resolveSessionPermissions(session: AdminSessionPayload): EmployeePermissions {
  if (isEnvAdmin(session)) {
    return {
      tabs: {
        bookings: true,
        slot_blocks: true,
        shifts: true,
        clients: true,
        content: true,
      },
      bookingsOwnOnly: false,
      hideOthersPhones: false,
      slotBlocksOwnOnly: false,
      shiftsOwnOnly: false,
    };
  }
  if (session.permissions) return session.permissions;
  if (session.employeeId) {
    const fromDb = getEmployeePermissionsById(session.employeeId);
    if (fromDb) return fromDb;
  }
  return DEFAULT_EMPLOYEE_PERMISSIONS;
}

export function hasTabAccess(session: AdminSessionPayload, tab: AdminPermissionTab): boolean {
  if (isEnvAdmin(session)) return true;
  return canAccessTab(resolveSessionPermissions(session), tab);
}

export function forbidden(message = "Недостаточно прав"): Response {
  return NextResponse.json({ message }, { status: 403 });
}

export async function requireAdminSession(): Promise<Response | null> {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Требуется вход" }, { status: 401 });
  }
  return null;
}

export async function requireEnvAdminSession(): Promise<
  { ok: true; session: AdminSessionPayload } | { ok: false; response: Response }
> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ message: "Требуется вход" }, { status: 401 }) };
  }
  if (!isEnvAdmin(session)) {
    return { ok: false, response: forbidden("Только главный администратор") };
  }
  return { ok: true, session };
}

/** @deprecated используйте requireEnvAdminSession или requireTabSession */
export async function requireFullAdminSession(): Promise<
  { ok: true; session: AdminSessionPayload } | { ok: false; response: Response }
> {
  return requireEnvAdminSession();
}

export async function requireTabSession(
  tab: AdminPermissionTab
): Promise<{ ok: true; session: AdminSessionPayload } | { ok: false; response: Response }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ message: "Требуется вход" }, { status: 401 }) };
  }
  if (!hasTabAccess(session, tab)) {
    return { ok: false, response: forbidden() };
  }
  return { ok: true, session };
}

/** Мастер может менять только ресурсы своего masterId (если включено ограничение) */
export function assertMasterOwns(
  session: AdminSessionPayload,
  resourceMasterId: string
): Response | null {
  if (isEnvAdmin(session)) return null;
  const perms = resolveSessionPermissions(session);
  const own = session.masterId;
  if (!own || resourceMasterId !== own) {
    return forbidden("Можно изменять только свои записи");
  }
  return null;
}

export function assertBookingEdit(
  session: AdminSessionPayload,
  resourceMasterId: string
): Response | null {
  if (isEnvAdmin(session)) return null;
  const perms = resolveSessionPermissions(session);
  if (!perms.bookingsOwnOnly) return null;
  return assertMasterOwns(session, resourceMasterId);
}

export function assertSlotBlockEdit(
  session: AdminSessionPayload,
  resourceMasterId: string
): Response | null {
  if (isEnvAdmin(session)) return null;
  const perms = resolveSessionPermissions(session);
  if (!perms.slotBlocksOwnOnly) return null;
  return assertMasterOwns(session, resourceMasterId);
}

export function assertShiftEdit(
  session: AdminSessionPayload,
  resourceMasterId: string
): Response | null {
  if (isEnvAdmin(session)) return null;
  const perms = resolveSessionPermissions(session);
  if (!perms.shiftsOwnOnly) return null;
  return assertMasterOwns(session, resourceMasterId);
}
