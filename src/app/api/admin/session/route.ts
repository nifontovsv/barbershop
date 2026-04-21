import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminJwt";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, authenticated: true });
}
