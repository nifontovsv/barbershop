import { getSiteKv, setSiteKv } from "@/lib/db";
import type { BookingsRealtimePayload } from "@/lib/adminBookingsRealtime";

const REVISION_KEY = "bookings_revision";
const LAST_EVENT_KEY = "bookings_last_event";

export function getBookingsRevision(): number {
  const raw = getSiteKv(REVISION_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function bumpBookingsRevision(event?: BookingsRealtimePayload): number {
  const next = getBookingsRevision() + 1;
  setSiteKv(REVISION_KEY, String(next));
  if (event) {
    setSiteKv(LAST_EVENT_KEY, JSON.stringify(event));
  }
  return next;
}

export function getLastBookingsEvent(): BookingsRealtimePayload | null {
  const raw = getSiteKv(LAST_EVENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BookingsRealtimePayload;
  } catch {
    return null;
  }
}
