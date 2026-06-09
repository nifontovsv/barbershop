import { NextResponse } from "next/server";
import {
  deleteMasterShift,
  getSalonHoursConfig,
  listMasterShifts,
  upsertMasterShift,
} from "@/lib/db";
import { assertShiftEdit, requireTabSession } from "@/lib/requireAdmin";

export async function GET(request: Request) {
  const auth = await requireTabSession("shifts");
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const masterId = url.searchParams.get("masterId") ?? "";
  const dateFrom = url.searchParams.get("from") ?? "";
  const dateTo = url.searchParams.get("to") ?? "";
  if (!masterId || !dateFrom || !dateTo) {
    return NextResponse.json({ message: "Нужны masterId, from, to" }, { status: 400 });
  }
  return NextResponse.json(listMasterShifts(masterId, dateFrom, dateTo));
}

export async function PUT(request: Request) {
  const auth = await requireTabSession("shifts");
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const body = await request.json().catch(() => ({}));
  const masterId = typeof body.masterId === "string" ? body.masterId : "";
  const workDate = typeof body.workDate === "string" ? body.workDate : "";
  const reset = body.reset === true;

  if (!masterId || !workDate) {
    return NextResponse.json({ message: "Нужны masterId и workDate" }, { status: 400 });
  }

  const denyOwn = assertShiftEdit(session, masterId);
  if (denyOwn) return denyOwn;

  if (reset) {
    deleteMasterShift(masterId, workDate);
    return NextResponse.json({ ok: true, reset: true });
  }

  const isDayOff = body.isDayOff === true;
  const salonHours = getSalonHoursConfig();
  let startHour = salonHours.startHour;
  let endHourExclusive = salonHours.endHourExclusive;

  if (!isDayOff) {
    startHour =
      typeof body.startHour === "number" && Number.isFinite(body.startHour)
        ? Math.floor(body.startHour)
        : salonHours.startHour;
    endHourExclusive =
      typeof body.endHourExclusive === "number" && Number.isFinite(body.endHourExclusive)
        ? Math.floor(body.endHourExclusive)
        : salonHours.endHourExclusive;
    if (startHour >= endHourExclusive) {
      return NextResponse.json({ message: "Некорректный интервал времени" }, { status: 400 });
    }
  }

  const row = upsertMasterShift({
    masterId,
    workDate,
    startHour,
    endHourExclusive,
    isDayOff,
  });
  return NextResponse.json(row);
}
