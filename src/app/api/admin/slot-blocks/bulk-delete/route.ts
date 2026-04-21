import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { deleteSlotBlocks } from "@/lib/db";

export async function POST(request: Request) {
  const deny = await requireAdminSession();
  if (deny) return deny;
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
    const deleted = deleteSlotBlocks(ids);
    return NextResponse.json({ ok: true, deleted, requested: ids.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
