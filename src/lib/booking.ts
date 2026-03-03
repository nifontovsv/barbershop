import { getSlots, createBooking as dbCreateBooking, type Booking } from "./db";
import { notifyMaster } from "./notify";

export { getSlots };

export function createBooking(
  masterId: string,
  serviceId: string,
  slotId: string,
  clientName: string,
  clientPhone: string,
  comment?: string
): Booking | null {
  const booking = dbCreateBooking(
    masterId,
    serviceId,
    slotId,
    clientName,
    clientPhone,
    comment
  );
  if (booking) {
    notifyMaster(booking.masterId, booking).catch((err) =>
      console.error("Notify master failed:", err)
    );
  }
  return booking;
}
