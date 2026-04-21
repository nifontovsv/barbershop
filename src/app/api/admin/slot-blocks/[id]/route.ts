import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { deleteSlotBlock } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireAdminSession();
  if (deny) return deny;
  const { id } = await params;
  if (!deleteSlotBlock(id)) {
    return NextResponse.json({ message: "Не найдено" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
