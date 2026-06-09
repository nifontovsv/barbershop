import { NextResponse } from "next/server";
import { ALL_MASTERS_BLOCK_ID } from "@/lib/slotBlockConstants";
import { assertSlotBlockEdit, forbidden, getAdminSession, requireTabSession } from "@/lib/requireAdmin";
import { deleteSlotBlock, getSlotBlockById, patchSlotBlock } from "@/lib/db";

function denySlotBlockEdit(session: NonNullable<Awaited<ReturnType<typeof getAdminSession>>>, id: string) {
  const block = getSlotBlockById(id);
  if (!block) return NextResponse.json({ message: "Не найдено" }, { status: 404 });
  if (block.masterId === ALL_MASTERS_BLOCK_ID) {
    return forbidden("Недостаточно прав для этой блокировки");
  }
  const deny = assertSlotBlockEdit(session, block.masterId);
  if (deny) return deny;
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTabSession("slot_blocks");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const deny = denySlotBlockEdit(auth.session, id);
  if (deny) return deny;
  const body = await request.json().catch(() => ({}));
  if (!("note" in body)) {
    return NextResponse.json({ message: "Укажите note (строка или null)" }, { status: 400 });
  }
  const note = body.note === null ? null : typeof body.note === "string" ? body.note : undefined;
  if (note === undefined) {
    return NextResponse.json({ message: "note должен быть строкой или null" }, { status: 400 });
  }
  const row = patchSlotBlock(id, { note });
  if (!row) {
    return NextResponse.json({ message: "Не найдено" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTabSession("slot_blocks");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const deny = denySlotBlockEdit(auth.session, id);
  if (deny) return deny;
  if (!deleteSlotBlock(id)) {
    return NextResponse.json({ message: "Не найдено" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
