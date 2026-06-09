import { NextResponse } from "next/server";
import { parseEmployeePermissions } from "@/lib/adminPermissions";
import type { EmployeePermissions } from "@/lib/adminPermissions";
import { deleteEmployee, updateEmployee } from "@/lib/db";
import { requireEnvAdminSession } from "@/lib/requireAdmin";

function parsePermissionsBody(body: Record<string, unknown>): EmployeePermissions | undefined {
  if (!body.permissions || typeof body.permissions !== "object") return undefined;
  return parseEmployeePermissions(JSON.stringify(body.permissions));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEnvAdminSession();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const patch: Parameters<typeof updateEmployee>[1] = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.login === "string") patch.login = body.login;
  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 6) {
      return NextResponse.json({ message: "Пароль не короче 6 символов" }, { status: 400 });
    }
    patch.password = body.password;
  }
  if (body.revokeAccess === true) patch.revokeAccess = true;
  if (body.masterId === null || typeof body.masterId === "string") patch.masterId = body.masterId;
  if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
  const permissions = parsePermissionsBody(body);
  if (permissions) patch.permissions = permissions;

  try {
    const row = updateEmployee(id, patch);
    if (!row) return NextResponse.json({ message: "Не найдено" }, { status: 404 });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ message: "Логин уже занят" }, { status: 409 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEnvAdminSession();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!deleteEmployee(id)) {
    return NextResponse.json({ message: "Не найдено" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
