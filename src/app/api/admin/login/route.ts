import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, signAdminSession } from "@/lib/adminJwt";
import { verifyAdminPassword } from "@/lib/adminPassword";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";
    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ ok: false, message: "Неверный пароль" }, { status: 401 });
    }
    const token = await signAdminSession();
    const res = NextResponse.json({ ok: true });
    const secure = process.env.NODE_ENV === "production";
    res.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Ошибка сервера. Проверьте ADMIN_SESSION_SECRET в .env" },
      { status: 500 }
    );
  }
}
