import { NextResponse } from "next/server";
import { getSalonHoursConfig, setSalonHoursConfig } from "@/lib/db";
import { validateSalonHours } from "@/lib/salonHours";
import { requireAdminSession, requireTabSession } from "@/lib/requireAdmin";

export async function GET() {
  const deny = await requireAdminSession();
  if (deny) return deny;
  return NextResponse.json(getSalonHoursConfig());
}

export async function PATCH(request: Request) {
  const auth = await requireTabSession("content");
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const config = {
    startHour: typeof body.startHour === "number" ? Math.floor(body.startHour) : NaN,
    endHourExclusive:
      typeof body.endHourExclusive === "number" ? Math.floor(body.endHourExclusive) : NaN,
  };

  const err = validateSalonHours(config);
  if (err) return NextResponse.json({ message: err }, { status: 400 });

  setSalonHoursConfig(config);
  return NextResponse.json(getSalonHoursConfig());
}
