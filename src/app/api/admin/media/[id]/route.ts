import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { deleteMediaItem, updateMediaItem } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireAdminSession();
  if (deny) return deny;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch: { path?: string; sortOrder?: number; alt?: string | null } = {};
  if (typeof body.path === "string") patch.path = body.path;
  if (body.sortOrder !== undefined) patch.sortOrder = Number(body.sortOrder);
  if (body.alt !== undefined) patch.alt = body.alt === null ? null : String(body.alt);
  const row = updateMediaItem(id, patch);
  if (!row) return NextResponse.json({ message: "Не найдено" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireAdminSession();
  if (deny) return deny;
  const { id } = await params;
  if (!deleteMediaItem(id)) {
    return NextResponse.json({ message: "Не найдено" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
