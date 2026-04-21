import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getAllSiteKv, setSiteKv } from "@/lib/db";

export async function GET() {
  const deny = await requireAdminSession();
  if (deny) return deny;
  return NextResponse.json(getAllSiteKv());
}

export async function PATCH(request: Request) {
  const deny = await requireAdminSession();
  if (deny) return deny;
  const body = await request.json().catch(() => ({}));
  const key = typeof body.key === "string" ? body.key.trim() : "";
  const value = body.value;
  if (!key || typeof value !== "string") {
    return NextResponse.json({ message: "Укажите key и value (строка JSON)" }, { status: 400 });
  }
  try {
    JSON.parse(value);
  } catch {
    return NextResponse.json({ message: "value должен быть валидным JSON" }, { status: 400 });
  }
  setSiteKv(key, value);
  return NextResponse.json({ ok: true, key });
}
