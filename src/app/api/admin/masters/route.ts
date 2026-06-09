import { NextResponse } from "next/server";
import { requireAdminSession, requireTabSession } from "@/lib/requireAdmin";
import { insertMasterLanding, listMastersAdmin } from "@/lib/db";

export async function GET() {
  const deny = await requireAdminSession();
  if (deny) return deny;
  return NextResponse.json(listMastersAdmin());
}

export async function POST(request: Request) {
  const auth = await requireTabSession("content");
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const specialty = typeof body.specialty === "string" ? body.specialty.trim() : "";
  if (!name || !specialty) {
    return NextResponse.json({ message: "Укажите имя и специализацию" }, { status: 400 });
  }
  const rating = typeof body.rating === "number" && Number.isFinite(body.rating) ? body.rating : 5;
  const phone = body.phone === null || typeof body.phone === "string" ? body.phone : null;
  const bio = body.bio === null || typeof body.bio === "string" ? body.bio : null;
  const badges = Array.isArray(body.badges)
    ? body.badges.filter((x: unknown): x is string => typeof x === "string")
    : [];
  const sortOrder = typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? body.sortOrder : 0;
  const photoPath = body.photoPath === null || typeof body.photoPath === "string" ? body.photoPath : null;
  const visibleOnLanding = typeof body.visibleOnLanding === "boolean" ? body.visibleOnLanding : true;
  const row = insertMasterLanding({
    name,
    specialty,
    rating,
    phone,
    bio,
    badges,
    sortOrder,
    photoPath,
    visibleOnLanding,
  });
  return NextResponse.json(row, { status: 201 });
}
