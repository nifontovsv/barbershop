import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { insertMediaItem, listMediaByKind } from "@/lib/db";

export async function GET(request: Request) {
  const deny = await requireAdminSession();
  if (deny) return deny;
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  if (!kind) {
    return NextResponse.json({ message: "Параметр kind обязателен" }, { status: 400 });
  }
  return NextResponse.json(listMediaByKind(kind));
}

export async function POST(request: Request) {
  const deny = await requireAdminSession();
  if (deny) return deny;
  const body = await request.json().catch(() => ({}));
  const kind = typeof body.kind === "string" ? body.kind.trim() : "";
  const pathVal = typeof body.path === "string" ? body.path.trim() : "";
  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : Number(body.sortOrder);
  const alt = typeof body.alt === "string" ? body.alt : undefined;
  if (!kind || !pathVal || !Number.isFinite(sortOrder)) {
    return NextResponse.json({ message: "Укажите kind, path, sortOrder" }, { status: 400 });
  }
  const row = insertMediaItem(kind, pathVal, sortOrder, alt);
  return NextResponse.json(row, { status: 201 });
}
