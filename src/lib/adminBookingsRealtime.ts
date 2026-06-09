import { EventEmitter } from "node:events";
import { bumpBookingsRevision } from "@/lib/bookingsRevision";

export type BookingsRealtimeReason = "booking_created" | "booking_updated" | "booking_deleted";

export type BookingsRealtimePayload = {
  reason: BookingsRealtimeReason | "sync";
  /** Дата/время начала записи — для перехода журнала на нужный день */
  slotStart?: string;
  /** Источник: онлайн-форма на сайте или админка */
  source?: "site" | "admin";
};

type BookingsRealtimeGlobal = typeof globalThis & {
  __barbershopBookingsEmitter?: EventEmitter;
};

function getEmitter(): EventEmitter {
  const g = globalThis as BookingsRealtimeGlobal;
  if (!g.__barbershopBookingsEmitter) {
    g.__barbershopBookingsEmitter = new EventEmitter();
    g.__barbershopBookingsEmitter.setMaxListeners(256);
  }
  return g.__barbershopBookingsEmitter;
}

/** Уведомить подписчиков (SSE в админке), что список записей изменился. */
export function emitBookingsChanged(payload: BookingsRealtimePayload): void {
  bumpBookingsRevision(payload);
  getEmitter().emit("update", payload);
}

export function onBookingsChanged(listener: (payload: BookingsRealtimePayload) => void): () => void {
  const emitter = getEmitter();
  emitter.on("update", listener);
  return () => {
    emitter.off("update", listener);
  };
}
