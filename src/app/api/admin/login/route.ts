import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, signAdminSession } from "@/lib/adminJwt";
import { verifyEmployeePassword } from "@/lib/employeePassword";
import { getEmployeeByLogin } from "@/lib/db";
import { verifyAdminPassword, verifyEnvAdminCredentials } from "@/lib/adminPassword";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";
    const login = typeof body.login === "string" ? body.login.trim() : "";

    if (login) {
      if (verifyEnvAdminCredentials(login, password)) {
        const token = await signAdminSession({
          isEnvAdmin: true,
          login,
        });
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
      }

      const employee = getEmployeeByLogin(login);
      if (
        !employee ||
        employee.isActive !== 1 ||
        !employee.passwordHash ||
        !verifyEmployeePassword(password, employee.passwordHash)
      ) {
        return NextResponse.json({ ok: false, message: "Неверный логин или пароль" }, { status: 401 });
      }
      const token = await signAdminSession({
        login: employee.login,
        employeeId: employee.id,
        masterId: employee.masterId,
        permissions: employee.permissions,
      });
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
    }

    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ ok: false, message: "Неверный пароль" }, { status: 401 });
    }
    const envLogin = process.env.ADMIN_LOGIN?.trim() || "admin";
    const token = await signAdminSession({ isEnvAdmin: true, login: envLogin });
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
