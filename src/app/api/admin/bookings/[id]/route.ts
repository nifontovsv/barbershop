import { NextResponse } from "next/server";
import {
  assertBookingEdit,
  forbidden,
  isEnvAdmin,
  requireTabSession,
  resolveSessionPermissions,
} from "@/lib/requireAdmin";
import { deleteBooking, getBookingById, patchBooking } from "@/lib/db";
import {
  getClientSmsStatusChangeHint,
  notifyClientBookingStatusChange,
  type ClientSmsStatusHint,
} from "@/lib/notify";
import { emitBookingsChanged } from "@/lib/adminBookingsRealtime";

function buildSlotIso(workDate: string, time: string): string | null {
  const [y, m, d] = workDate.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const SALON_UTC_OFFSET_HOURS = 3;
  const dt = new Date(Date.UTC(y, m - 1, d, hh - SALON_UTC_OFFSET_HOURS, mm, 0, 0));
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTabSession("bookings");
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const perms = resolveSessionPermissions(session);
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const patch: Parameters<typeof patchBooking>[1] = {};

  if ("status" in body && typeof body.status === "string") {
    const s = body.status.trim();
    if (!s) return NextResponse.json({ message: "status не может быть пустым" }, { status: 400 });
    patch.status = s;
  }

  if ("masterComment" in body) {
    const v = body.masterComment;
    if (v === null || v === undefined) patch.masterComment = null;
    else if (typeof v === "string") {
      const t = v.trim();
      patch.masterComment = t === "" ? null : t;
    } else {
      return NextResponse.json({ message: "Некорректный masterComment" }, { status: 400 });
    }
  }

  if (typeof body.clientName === "string") patch.clientName = body.clientName;
  if (typeof body.clientPhone === "string") patch.clientPhone = body.clientPhone;
  if ("clientEmail" in body) {
    if (body.clientEmail === null) patch.clientEmail = null;
    else if (typeof body.clientEmail === "string") patch.clientEmail = body.clientEmail;
  }

  if ("comment" in body) {
    if (body.comment === null) patch.comment = null;
    else if (typeof body.comment === "string") patch.comment = body.comment;
  }

  if (typeof body.serviceId === "string") patch.serviceId = body.serviceId;
  if (typeof body.masterId === "string") patch.masterId = body.masterId;

  if (typeof body.slotStart === "string") patch.slotStart = body.slotStart;
  if (typeof body.slotEnd === "string") patch.slotEnd = body.slotEnd;

  if (typeof body.workDate === "string" && typeof body.startTime === "string" && typeof body.endTime === "string") {
    const slotStart = buildSlotIso(body.workDate, body.startTime);
    const slotEnd = buildSlotIso(body.workDate, body.endTime);
    if (!slotStart || !slotEnd) {
      return NextResponse.json({ message: "Некорректные дата или время" }, { status: 400 });
    }
    patch.slotStart = slotStart;
    patch.slotEnd = slotEnd;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: "Нет полей для обновления" }, { status: 400 });
  }

  const before = getBookingById(id);
  if (!before) return NextResponse.json({ message: "Не найдено" }, { status: 404 });

  const denyOwn = assertBookingEdit(session, before.masterId);
  if (denyOwn) return denyOwn;
  if (!isEnvAdmin(session) && perms.bookingsOwnOnly && patch.masterId && patch.masterId !== before.masterId) {
    return forbidden("Нельзя переносить запись другому мастеру");
  }

  const row = patchBooking(id, patch);
  if (!row) {
    return NextResponse.json(
      { message: "Не удалось сохранить: проверьте время, мастера и занятость слота" },
      { status: 409 }
    );
  }

  let clientSms: ClientSmsStatusHint | undefined;
  if (patch.status !== undefined) {
    clientSms = getClientSmsStatusChangeHint(before.status, row);
    if (
      before.status !== row.status &&
      (row.status === "confirmed" || row.status === "cancelled")
    ) {
      notifyClientBookingStatusChange(before.status, row).catch((err) =>
        console.error("Notify client status SMS failed:", err)
      );
    }
  }

  emitBookingsChanged({ reason: "booking_updated" });

  return NextResponse.json({ ...row, clientSms });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTabSession("bookings");
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const { id } = await params;
  const before = getBookingById(id);
  if (!before) {
    return NextResponse.json({ message: "Не найдено" }, { status: 404 });
  }
  const denyOwn = assertBookingEdit(session, before.masterId);
  if (denyOwn) return denyOwn;
  if (!deleteBooking(id)) {
    return NextResponse.json({ message: "Не удалось удалить" }, { status: 500 });
  }
  emitBookingsChanged({ reason: "booking_deleted" });
  return NextResponse.json({ ok: true });
}
