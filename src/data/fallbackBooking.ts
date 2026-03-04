import type { Service, Master, TimeSlot } from "@/types/booking";

/** Демо-слоты по графику Пн–Пт 12:00–22:00 (когда API недоступен) */
export function getFallbackSlots(masterId: string, dateStr: string): TimeSlot[] {
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return [];
  const slots: TimeSlot[] = [];
  for (let hour = 12; hour < 22; hour++) {
    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(date);
    end.setHours(hour + 1, 0, 0, 0);
    const id = `${masterId}-${dateStr}-${String(hour).padStart(2, "0")}`;
    slots.push({
      id,
      masterId,
      start: start.toISOString(),
      end: end.toISOString(),
      available: true,
    });
  }
  return slots;
}

/** Статичные данные для модалки записи, когда API недоступен (например на GitHub Pages) */
export const FALLBACK_SERVICES: Service[] = [
  { id: "1", name: "Стрижка", durationMinutes: 45, price: 2500, sortOrder: 1 },
  { id: "2", name: "Удлиненная стрижка", durationMinutes: 60, price: 3000, sortOrder: 2 },
  { id: "3", name: "Стрижка+моделирование бороды", durationMinutes: 60, price: 3700, sortOrder: 3 },
  { id: "4", name: "Стрижка+бритьё лица", durationMinutes: 60, price: 3700, sortOrder: 4 },
  { id: "5", name: "Стрижка машинкой", durationMinutes: 30, price: 2000, sortOrder: 5 },
  { id: "6", name: "Моделирование бороды", durationMinutes: 30, price: 1700, sortOrder: 6 },
  { id: "7", name: "Укладка", durationMinutes: 15, price: 1000, sortOrder: 7 },
  { id: "8", name: "Камуфляж стрижки", durationMinutes: 45, price: 1600, sortOrder: 8 },
  { id: "9", name: "Камуфляж бороды", durationMinutes: 30, price: 1100, sortOrder: 9 },
  { id: "10", name: "Бритьё головы", durationMinutes: 45, price: 2500, sortOrder: 10 },
  { id: "11", name: "Бритьё лица", durationMinutes: 30, price: 2000, sortOrder: 11 },
  { id: "12", name: "Воск", durationMinutes: 15, price: 600, sortOrder: 12 },
];

export const FALLBACK_MASTERS: Master[] = [
  { id: "1", name: "Марат", specialty: "Мужские стрижки, борода", rating: 5.0 },
  { id: "2", name: "Владимир", specialty: "Стрижки, бритьё", rating: 5.0 },
];
