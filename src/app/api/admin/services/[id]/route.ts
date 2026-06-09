import { NextResponse } from "next/server";
import { requireTabSession } from "@/lib/requireAdmin";
import { deleteService, updateService } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTabSession("content");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch: Parameters<typeof updateService>[1] = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.durationMinutes === "number") patch.durationMinutes = body.durationMinutes;
  if (body.price === null || typeof body.price === "number") patch.price = body.price;
  if (typeof body.sortOrder === "number") patch.sortOrder = body.sortOrder;
  if ("categoryId" in body) {
    if (body.categoryId === null || body.categoryId === "") patch.categoryId = null;
    else if (typeof body.categoryId === "string") patch.categoryId = body.categoryId;
  }
  const row = updateService(id, patch);
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
  const result = deleteService(id);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ message: "Не найдено" }, { status: 404 });
    }
    return NextResponse.json(
      { message: "Нельзя удалить услугу: есть записи с этой услугой" },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}
