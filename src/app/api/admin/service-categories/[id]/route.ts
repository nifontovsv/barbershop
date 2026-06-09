import { NextResponse } from "next/server";
import { requireTabSession } from "@/lib/requireAdmin";
import { deleteServiceCategory, updateServiceCategory } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTabSession("content");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch: { name?: string; sortOrder?: number } = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.sortOrder === "number") patch.sortOrder = body.sortOrder;
  const row = updateServiceCategory(id, patch);
  if (!row) return NextResponse.json({ message: "Не найдено" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTabSession("content");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const result = deleteServiceCategory(id);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ message: "Не найдено" }, { status: 404 });
    }
    return NextResponse.json(
      { message: "Сначала перенесите или удалите услуги из этой категории" },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}
