import { bookingStatusTone, type BookingStatusTone } from "@/lib/scheduleLayout";

export interface BookingStatusTheme {
  card: string;
  accent: string;
  text: string;
  sub: string;
  statusBadge: string;
  /** Кнопка статуса в модалке — те же цвета, что у записи в ячейке */
  modalActive: string;
}

export const BOOKING_STATUS_THEMES: Record<BookingStatusTone, BookingStatusTheme> = {
  pending: {
    card: "bg-gradient-to-r from-orange-600/95 via-amber-500/92 to-amber-300/90 ring-1 ring-amber-200/35",
    accent: "bg-amber-950/75",
    text: "text-white",
    sub: "text-white/92",
    statusBadge: "bg-amber-950/85 text-amber-50 shadow-md ring-1 ring-amber-200/20",
    modalActive: "bg-amber-400/55 text-amber-50 border-amber-300/55",
  },
  confirmed: {
    card: "bg-gradient-to-r from-teal-600/95 via-emerald-500/92 to-emerald-300/90 ring-1 ring-emerald-200/35",
    accent: "bg-emerald-950/75",
    text: "text-white",
    sub: "text-white/92",
    statusBadge: "bg-emerald-950/85 text-emerald-50 shadow-md ring-1 ring-emerald-200/20",
    modalActive: "bg-emerald-400/55 text-emerald-50 border-emerald-300/55",
  },
  done: {
    card: "bg-gradient-to-r from-blue-600/95 via-sky-500/92 to-sky-300/90 ring-1 ring-sky-200/35",
    accent: "bg-sky-950/75",
    text: "text-white",
    sub: "text-white/92",
    statusBadge: "bg-sky-950/85 text-sky-50 shadow-md ring-1 ring-sky-200/20",
    modalActive: "bg-sky-400/55 text-sky-50 border-sky-300/55",
  },
  cancelled: {
    card: "bg-gradient-to-r from-red-700/95 via-red-500/92 to-rose-400/90 ring-1 ring-rose-200/30",
    accent: "bg-red-950/75",
    text: "text-white",
    sub: "text-white/92",
    statusBadge: "bg-red-950/85 text-red-50 shadow-md ring-1 ring-rose-200/20",
    modalActive: "bg-red-500/55 text-red-50 border-red-400/55",
  },
  default: {
    card: "bg-gradient-to-r from-zinc-700/95 via-zinc-500/92 to-zinc-400/90 ring-1 ring-white/15",
    accent: "bg-zinc-900/70",
    text: "text-white",
    sub: "text-white/92",
    statusBadge: "bg-zinc-950/85 text-white shadow-md ring-1 ring-white/15",
    modalActive: "bg-zinc-500/55 text-zinc-100 border-zinc-400/55",
  },
};

export const BOOKING_STATUS_BUTTONS = [
  { value: "pending", label: "Ожидание" },
  { value: "done", label: "+ Пришел" },
  { value: "cancelled", label: "− Не пришел" },
  { value: "confirmed", label: "✓ Подтвердил" },
] as const;

export function getBookingStatusTheme(status: string): BookingStatusTheme {
  return BOOKING_STATUS_THEMES[bookingStatusTone(status)];
}

export function bookingStatusLabel(status: string): string {
  switch (bookingStatusTone(status)) {
    case "pending":
      return "Ожидание";
    case "confirmed":
      return "Подтверждено";
    case "cancelled":
      return "Не пришёл";
    case "done":
      return "Пришёл";
    default:
      return status;
  }
}
