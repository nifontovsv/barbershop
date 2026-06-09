import { NextResponse } from "next/server";

export const runtime = "nodejs";
import {
  assertBookingEdit,
  isEnvAdmin,
  requireTabSession,
  resolveSessionPermissions,
} from "@/lib/requireAdmin";
import { deleteMasterBreak, getMasterBreakById, patchMasterBreak } from "@/lib/db";
import { emitBookingsChanged } from "@/lib/adminBookingsRealtime";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTabSession("bookings");
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const perms = resolveSessionPermissions(session);
  const { id } = await params;
  const before = getMasterBreakById(id);
  if (!before) {
    return NextResponse.json({ message: "Не найдено" }, { status: 404 });
  }

  const denyOwn = assertBookingEdit(session, before.masterId);
  if (denyOwn) return denyOwn;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Parameters<typeof patchMasterBreak>[1] = {};

  if (!isEnvAdmin(session) && perms.bookingsOwnOnly) {
    patch.masterId = session.masterId ?? before.masterId;
  } else if (typeof body.masterId === "string") {
    patch.masterId = body.masterId;
  }
  if (typeof body.workDate === "string") patch.workDate = body.workDate;
  if (typeof body.startTime === "string") patch.startTime = body.startTime;
  if (body.durationMinutes !== undefined) patch.durationMinutes = Number(body.durationMinutes);
  if (body.comment !== undefined) {
    patch.comment = typeof body.comment === "string" ? body.comment : null;
  }

  const row = patchMasterBreak(id, patch);
  if (!row) {
    return NextResponse.json(
      { message: "Не удалось сохранить перерыв: проверьте время и занятость" },
      { status: 409 }
    );
  }

  emitBookingsChanged({ reason: "booking_updated", slotStart: row.slotStart, source: "admin" });
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTabSession("bookings");
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const { id } = await params;
  const before = getMasterBreakById(id);
  if (!before) {
    return NextResponse.json({ message: "Не найдено" }, { status: 404 });
  }
  const denyOwn = assertBookingEdit(session, before.masterId);
  if (denyOwn) return denyOwn;
  if (!deleteMasterBreak(id)) {
    return NextResponse.json({ message: "Не удалось удалить" }, { status: 500 });
  }
  emitBookingsChanged({ reason: "booking_deleted" });
  return NextResponse.json({ ok: true });
}
