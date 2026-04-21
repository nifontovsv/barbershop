import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getBookingById, patchBooking } from "@/lib/db";
import {
  getClientSmsStatusChangeHint,
  notifyClientBookingStatusChange,
  type ClientSmsStatusHint,
} from "@/lib/notify";
import { emitBookingsChanged } from "@/lib/adminBookingsRealtime";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireAdminSession();
  if (deny) return deny;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const hasStatus = "status" in body && typeof body.status === "string";
  const hasMasterComment = "masterComment" in body;

  if (!hasStatus && !hasMasterComment) {
    return NextResponse.json({ message: "Укажите status и/или masterComment" }, { status: 400 });
  }

  const patch: { status?: string; masterComment?: string | null } = {};
  if (hasStatus) {
    const s = (body.status as string).trim();
    if (!s) {
      return NextResponse.json({ message: "status не может быть пустым" }, { status: 400 });
    }
    patch.status = s;
  }
  if (hasMasterComment) {
    const v = body.masterComment;
    if (v === null || v === undefined) {
      patch.masterComment = null;
    } else if (typeof v === "string") {
      const t = v.trim();
      patch.masterComment = t === "" ? null : t;
    } else {
      return NextResponse.json({ message: "Некорректный masterComment" }, { status: 400 });
    }
  }

  const before = getBookingById(id);
  if (!before) return NextResponse.json({ message: "Не найдено" }, { status: 404 });

  const row = patchBooking(id, patch);
  if (!row) return NextResponse.json({ message: "Не найдено" }, { status: 404 });

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

  emitBookingsChanged("booking_updated");

  return NextResponse.json({ ...row, clientSms });
}
