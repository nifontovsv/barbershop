import { EventEmitter } from "node:events";

export type BookingsRealtimeReason = "booking_created" | "booking_updated";

const emitter = new EventEmitter();
emitter.setMaxListeners(256);

/** Уведомить подписчиков (SSE в админке), что список записей изменился. */
export function emitBookingsChanged(reason: BookingsRealtimeReason): void {
  emitter.emit("update", reason);
}

export function onBookingsChanged(listener: (reason: BookingsRealtimeReason) => void): () => void {
  emitter.on("update", listener);
  return () => {
    emitter.off("update", listener);
  };
}
