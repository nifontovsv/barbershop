import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { listBookings } from "@/lib/db";

export async function GET(request: Request) {
  const deny = await requireAdminSession();
  if (deny) return deny;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 200));
  return NextResponse.json(listBookings(limit));
}
