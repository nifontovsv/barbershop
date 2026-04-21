import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getServices, insertService } from "@/lib/db";

export async function GET() {
  const deny = await requireAdminSession();
  if (deny) return deny;
  return NextResponse.json(getServices());
}

export async function POST(request: Request) {
  const deny = await requireAdminSession();
  if (deny) return deny;
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
  const durationMinutes =
    typeof body.durationMinutes === "number" && Number.isFinite(body.durationMinutes)
      ? Math.max(1, Math.floor(body.durationMinutes))
      : 30;
  const priceRaw = body.price;
  const price =
    priceRaw === null || priceRaw === ""
      ? null
      : typeof priceRaw === "number" && Number.isFinite(priceRaw)
        ? Math.floor(priceRaw)
        : null;
  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? body.sortOrder : 0;
  if (!name || !categoryId) {
    return NextResponse.json({ message: "Укажите название и категорию" }, { status: 400 });
  }
  const row = insertService({ name, durationMinutes, price, sortOrder, categoryId });
  return NextResponse.json(row, { status: 201 });
}
