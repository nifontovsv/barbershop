import { NextResponse } from "next/server";
import { requireTabSession } from "@/lib/requireAdmin";
import { deleteMasterLanding, updateMasterLanding } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTabSession("content");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch: Parameters<typeof updateMasterLanding>[1] = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.specialty === "string") patch.specialty = body.specialty;
  if (typeof body.rating === "number") patch.rating = body.rating;
  if (body.phone === null || typeof body.phone === "string") patch.phone = body.phone;
  if (body.bio === null || typeof body.bio === "string") patch.bio = body.bio;
  if (Array.isArray(body.badges)) patch.badges = body.badges.filter((x: unknown) => typeof x === "string");
  if (typeof body.sortOrder === "number") patch.sortOrder = body.sortOrder;
  if (body.photoPath === null || typeof body.photoPath === "string") patch.photoPath = body.photoPath;
  if (typeof body.visibleOnLanding === "boolean") patch.visibleOnLanding = body.visibleOnLanding;
  const row = updateMasterLanding(id, patch);
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
  const result = deleteMasterLanding(id);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ message: "Мастер не найден" }, { status: 404 });
    }
    return NextResponse.json(
      {
        message:
          "Нельзя удалить мастера: есть записи в журнале. Отмените или дождитесь выполнения записей, либо удалите их вручную в БД.",
      },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}
