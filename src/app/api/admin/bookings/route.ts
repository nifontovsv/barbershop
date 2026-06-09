import { NextResponse } from "next/server";
import {
  isEnvAdmin,
  requireTabSession,
  resolveSessionPermissions,
} from "@/lib/requireAdmin";
import { adminCreateBooking, listBookings } from "@/lib/db";
import { emitBookingsChanged } from "@/lib/adminBookingsRealtime";

export async function GET(request: Request) {
  const auth = await requireTabSession("bookings");
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 200));
  return NextResponse.json(listBookings(limit));
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
  const serviceId = typeof body.serviceId === "string" ? body.serviceId : "";
  const workDate = typeof body.workDate === "string" ? body.workDate : "";
  const startTime = typeof body.startTime === "string" ? body.startTime : "";
  const endTime = typeof body.endTime === "string" ? body.endTime : "";
  const clientName = typeof body.clientName === "string" ? body.clientName : "";
  const clientPhone = typeof body.clientPhone === "string" ? body.clientPhone : "";

  if (!masterId || !serviceId || !workDate || !startTime || !endTime) {
    return NextResponse.json({ message: "Заполните мастера, услугу, дату и время" }, { status: 400 });
  }

  const row = adminCreateBooking({
    masterId,
    serviceId,
    workDate,
    startTime,
    endTime,
    clientName,
    clientPhone,
    clientEmail: typeof body.clientEmail === "string" ? body.clientEmail : null,
    comment: typeof body.comment === "string" ? body.comment : null,
    masterComment: typeof body.masterComment === "string" ? body.masterComment : null,
    status: typeof body.status === "string" ? body.status : "pending",
  });

  if (!row) {
    return NextResponse.json(
      { message: "Не удалось создать запись: проверьте время, занятость слота и блокировки" },
      { status: 409 }
    );
  }

  emitBookingsChanged({
    reason: "booking_created",
    slotStart: row.slotStart,
    source: "admin",
  });
  return NextResponse.json(row);
}
