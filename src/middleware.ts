import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminJwt";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const prefix = basePath || "";
  const adminLogin = prefix ? `${prefix}/admin/login` : "/admin/login";
  const adminPrefix = prefix ? `${prefix}/admin` : "/admin";

  if (pathname === adminLogin || pathname === `${adminLogin}/`) {
    return NextResponse.next();
  }
  if (pathname.startsWith(adminPrefix)) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token || !(await verifyAdminSessionToken(token))) {
      const loginUrl = new URL(adminLogin, request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
