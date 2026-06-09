import { NextResponse } from "next/server";
import { ALL_MASTERS_BLOCK_ID } from "@/lib/slotBlockConstants";
import { assertSlotBlockEdit, forbidden, requireTabSession } from "@/lib/requireAdmin";
import { deleteSlotBlocks, getSlotBlockById } from "@/lib/db";

export async function POST(request: Request) {
  const auth = await requireTabSession("slot_blocks");
  if (!auth.ok) return auth.response;
  const session = auth.session;
  try {
    const body = await request.json().catch(() => ({}));
    const raw = body.ids;
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ message: "Укажите ids — массив строк" }, { status: 400 });
    }
    const ids = raw.filter((x: unknown): x is string => typeof x === "string" && x.length > 0);
    if (ids.length === 0) {
      return NextResponse.json({ message: "Нет корректных id" }, { status: 400 });
    }

    for (const id of ids) {
      const block = getSlotBlockById(id);
      if (!block) {
        return NextResponse.json({ message: "Блокировка не найдена" }, { status: 404 });
      }
      if (block.masterId === ALL_MASTERS_BLOCK_ID) {
        return forbidden("Недостаточно прав для этой блокировки");
      }
      const deny = assertSlotBlockEdit(session, block.masterId);
      if (deny) return deny;
    }

    const deleted = deleteSlotBlocks(ids);
    return NextResponse.json({ ok: true, deleted, requested: ids.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
