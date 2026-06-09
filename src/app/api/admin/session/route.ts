import { NextResponse } from "next/server";
import { getEmployeeLoginById } from "@/lib/db";
import {
  getAdminSession,
  isEnvAdmin,
  resolveSessionPermissions,
} from "@/lib/requireAdmin";

function resolveSessionLogin(session: NonNullable<Awaited<ReturnType<typeof getAdminSession>>>): string {
  if (session.login) return session.login;
  if (session.employeeId) {
    const fromDb = getEmployeeLoginById(session.employeeId);
    if (fromDb) return fromDb;
  }
  return process.env.ADMIN_LOGIN?.trim() || "admin";
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }
  const permissions = resolveSessionPermissions(session);
  return NextResponse.json({
    ok: true,
    authenticated: true,
    login: resolveSessionLogin(session),
    isEnvAdmin: isEnvAdmin(session),
    masterId: session.masterId ?? null,
    employeeId: session.employeeId ?? null,
    permissions,
  });
}
