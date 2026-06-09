import { NextResponse } from "next/server";

export const runtime = "nodejs";
import {
  isEnvAdmin,
  requireTabSession,
  resolveSessionPermissions,
} from "@/lib/requireAdmin";
import { createMasterBreak, listMasterBreaks } from "@/lib/db";
import { emitBookingsChanged } from "@/lib/adminBookingsRealtime";

export async function GET(request: Request) {
  const auth = await requireTabSession("bookings");
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 300));
  return NextResponse.json(listMasterBreaks(limit));
}

export async function POST(request: Request) {
  const auth = await requireTabSession("bookings");
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const perms = resolveSessionPermissions(session);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  let masterId = typeof body.masterId === "string" ? body.masterId : "";
  if (!isEnvAdmin(session) && perms.bookingsOwnOnly) {
    if (!session.masterId) {
      return NextResponse.json({ message: "У сотрудника не привязан мастер" }, { status: 403 });
    }
    masterId = session.masterId;
  }

  const workDate = typeof body.workDate === "string" ? body.workDate : "";
  const startTime = typeof body.startTime === "string" ? body.startTime : "";
  const durationMinutes = Number(body.durationMinutes);

  if (!masterId || !workDate || !startTime || !Number.isFinite(durationMinutes)) {
    return NextResponse.json({ message: "Заполните мастера, дату, время и длительность" }, { status: 400 });
  }

  const row = createMasterBreak({
    masterId,
    workDate,
    startTime,
    durationMinutes,
    comment: typeof body.comment === "string" ? body.comment : null,
  });

  if (!row) {
    return NextResponse.json(
      { message: "Не удалось создать перерыв: проверьте время, занятость и блокировки" },
      { status: 409 }
    );
  }

  emitBookingsChanged({ reason: "booking_updated", slotStart: row.slotStart, source: "admin" });
  return NextResponse.json(row, { status: 201 });
}
