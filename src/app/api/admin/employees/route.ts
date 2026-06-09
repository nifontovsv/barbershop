import { NextResponse } from "next/server";
import {
  DEFAULT_EMPLOYEE_PERMISSIONS,
  parseEmployeePermissions,
  type EmployeePermissions,
} from "@/lib/adminPermissions";
import { insertEmployee, listEmployees } from "@/lib/db";
import { requireEnvAdminSession } from "@/lib/requireAdmin";

function parsePermissionsBody(body: Record<string, unknown>): EmployeePermissions | undefined {
  if (!body.permissions || typeof body.permissions !== "object") return undefined;
  return parseEmployeePermissions(JSON.stringify(body.permissions));
}

export async function GET() {
  const auth = await requireEnvAdminSession();
  if (!auth.ok) return auth.response;
  return NextResponse.json(listEmployees());
}

export async function POST(request: Request) {
  const auth = await requireEnvAdminSession();
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const login = typeof body.login === "string" ? body.login.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const masterId = typeof body.masterId === "string" && body.masterId ? body.masterId : null;

  if (!name || !login) {
    return NextResponse.json({ message: "Укажите имя и логин" }, { status: 400 });
  }
  if (password.length > 0 && password.length < 6) {
    return NextResponse.json({ message: "Пароль не короче 6 символов" }, { status: 400 });
  }

  try {
    const row = insertEmployee({
      name,
      login,
      password: password || null,
      masterId,
      permissions: parsePermissionsBody(body) ?? DEFAULT_EMPLOYEE_PERMISSIONS,
      isActive: true,
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ message: "Логин уже занят" }, { status: 409 });
  }
}
