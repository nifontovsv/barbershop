import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { insertServiceCategory, listServiceCategories } from "@/lib/db";

export async function GET() {
  const deny = await requireAdminSession();
  if (deny) return deny;
  return NextResponse.json(listServiceCategories());
}

export async function POST(request: Request) {
  const deny = await requireAdminSession();
  if (deny) return deny;
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const sortOrder = typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? body.sortOrder : 0;
  if (!name) {
    return NextResponse.json({ message: "Укажите название категории" }, { status: 400 });
  }
  const row = insertServiceCategory(name, sortOrder);
  return NextResponse.json(row, { status: 201 });
}
