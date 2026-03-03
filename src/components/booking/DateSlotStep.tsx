"use client";

import { useMemo } from "react";
import type { TimeSlot } from "@/types/booking";

const DAYS_AHEAD = 14;

interface DateSlotStepProps {
  slots: TimeSlot[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: TimeSlot) => void;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
  loading: boolean;
}

function getDateStrings(): string[] {
  const list: string[] = [];
  const today = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    list.push(d.toISOString().slice(0, 10));
  }
  return list;
}

export function DateSlotStep({
  slots,
  selectedSlotId,
  onSelectSlot,
  selectedDate,
  onSelectDate,
  loading,
}: DateSlotStepProps) {
  const dateOptions = useMemo(() => getDateStrings(), []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--text)]">Дата и время</h3>
      <div>
        <p className="mb-2 text-sm text-[var(--text-muted)]">Дата</p>
        <div className="flex flex-wrap gap-2">
          {dateOptions.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDate(d)}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                selectedDate === d
                  ? "bg-[var(--accent)] text-black"
                  : "bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface)]/80"
              }`}
            >
              {new Date(d + "T12:00:00").toLocaleDateString("ru-RU", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </button>
          ))}
        </div>
      </div>
      {selectedDate && (
        <div>
          <p className="mb-2 text-sm text-[var(--text-muted)]">Время</p>
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => slot.available && onSelectSlot(slot)}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    selectedSlotId === slot.id
                      ? "bg-[var(--accent)] text-black"
                      : slot.available
                        ? "bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--accent)]/20"
                        : "bg-[var(--surface)]/60 text-[var(--text-muted)]"
                  }`}
                >
                  {new Date(slot.start).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
