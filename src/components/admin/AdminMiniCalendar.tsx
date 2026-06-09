"use client";

import { useMemo, useState } from "react";
import {
  getCalendarDays,
  MONTH_NAMES,
  WEEKDAY_NAMES_SHORT,
  ymdFromParts,
} from "@/lib/calendarGrid";
import { todayYmd } from "@/lib/scheduleLayout";

interface AdminMiniCalendarProps {
  selectedDate: string;
  onSelectDate: (ymd: string) => void;
  compact?: boolean;
}

export function AdminMiniCalendar({ selectedDate, onSelectDate, compact }: AdminMiniCalendarProps) {
  const today = useMemo(() => todayYmd(), []);
  const [viewDate, setViewDate] = useState(() => {
    const [y, m] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const prevMonth = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  };

  const nextMonth = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  return (
    <div className={compact ? "px-1" : "px-3"}>
      <div className="mb-2 flex items-center justify-between gap-1">
        {!compact ? (
          <span className="text-sm font-semibold text-white/90">{monthLabel}</span>
        ) : (
          <span className="truncate text-[10px] font-medium text-white/70">{monthLabel}</span>
        )}
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Предыдущий месяц"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Следующий месяц"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_NAMES_SHORT.map((name) => (
          <div
            key={name}
            className={`py-1 text-center font-medium text-white/40 ${compact ? "text-[9px]" : "text-[10px]"}`}
          >
            {name}
          </div>
        ))}
        {calendarDays.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className={compact ? "aspect-square" : "aspect-square"} />;
          }
          const dateStr = ymdFromParts(viewYear, viewMonth, day);
          const selected = selectedDate === dateStr;
          const isToday = today === dateStr;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`aspect-square cursor-pointer rounded-full text-center transition ${
                compact ? "text-[10px]" : "text-xs"
              } ${
                selected
                  ? "bg-(--accent) font-semibold text-black"
                  : isToday
                    ? "font-semibold text-(--accent) ring-1 ring-(--accent)/50 hover:bg-white/10"
                    : "text-white/80 hover:bg-white/10"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
