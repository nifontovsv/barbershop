import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminJwt";

export async function requireAdminSession(): Promise<Response | null> {
  const c = await cookies();
  const t = c.get(ADMIN_SESSION_COOKIE)?.value;
  if (!t || !(await verifyAdminSessionToken(t))) {
    return NextResponse.json({ message: "Требуется вход" }, { status: 401 });
  }
  return null;
}
