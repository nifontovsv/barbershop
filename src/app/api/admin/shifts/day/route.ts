import { NextResponse } from "next/server";
import { listMasterShiftsForDate } from "@/lib/db";
import { requireAdminSession } from "@/lib/requireAdmin";

export async function GET(request: Request) {
  const denied = await requireAdminSession();
  if (denied) return denied;
  const date = new URL(request.url).searchParams.get("date")?.trim() ?? "";
  if (!date) {
    return NextResponse.json({ message: "Нужен параметр date (YYYY-MM-DD)" }, { status: 400 });
  }
  return NextResponse.json(listMasterShiftsForDate(date));
}
