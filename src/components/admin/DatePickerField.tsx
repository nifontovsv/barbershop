"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  formatYmdDisplay,
  getCalendarCells,
  MONTH_NAMES,
  ymdFromParts,
} from "@/lib/calendarGrid";

const WEEKDAY_LABELS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;

interface DatePickerFieldProps {
  value: string;
  onChange: (ymd: string) => void;
  disabled?: boolean;
  className?: string;
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-white/40">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-white/50 transition hover:bg-white/10 hover:text-white"
      aria-label={label}
    >
      {children}
    </button>
  );
}

export function DatePickerField({ value, onChange, disabled, className }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 0 });

  const [y, m] = value.split("-").map(Number);
  const [viewDate, setViewDate] = useState(() => new Date(y, m - 1, 1));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const [vy, vm] = value.split("-").map(Number);
    if (vy && vm) setViewDate(new Date(vy, vm - 1, 1));
  }, [value]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const calendarCells = useMemo(
    () => getCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPopoverPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 280),
    });
  };

  const openPicker = () => {
    if (disabled) return;
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectDate = (year: number, month: number, day: number) => {
    onChange(ymdFromParts(year, month, day));
    setViewDate(new Date(year, month, 1));
    setOpen(false);
  };

  const popover = open && mounted ? (
    <div
      ref={popoverRef}
      className="fixed z-[300] rounded-xl border border-white/10 bg-[var(--surface)] p-3 shadow-2xl shadow-black/60"
      style={{
        top: popoverPos.top,
        left: popoverPos.left,
        width: popoverPos.width,
      }}
      role="dialog"
      aria-label="Выбор даты"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-0.5">
          <NavButton label="Предыдущий месяц" onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
            ‹
          </NavButton>
          <span className="min-w-[4.5rem] text-sm font-medium text-white/90">{MONTH_NAMES[viewMonth]}</span>
          <NavButton label="Следующий месяц" onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
            ›
          </NavButton>
        </div>
        <div className="flex items-center gap-0.5">
          <NavButton label="Предыдущий год" onClick={() => setViewDate((d) => new Date(d.getFullYear() - 1, d.getMonth(), 1))}>
            ‹
          </NavButton>
          <span className="min-w-[2.5rem] text-center text-sm font-medium text-white/90">{viewYear}</span>
          <NavButton label="Следующий год" onClick={() => setViewDate((d) => new Date(d.getFullYear() + 1, d.getMonth(), 1))}>
            ›
          </NavButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((name) => (
          <div key={name} className="py-1 text-center text-[11px] font-medium text-white/40">
            {name}
          </div>
        ))}
        {calendarCells.map((cell) => {
          const dateStr = ymdFromParts(cell.year, cell.month, cell.day);
          const selected = value === dateStr;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => selectDate(cell.year, cell.month, cell.day)}
              className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg text-sm transition ${
                selected
                  ? "bg-[var(--accent)] font-semibold text-black"
                  : cell.inCurrentMonth
                    ? "text-white/85 hover:bg-[var(--accent)]/15"
                    : "text-white/25 hover:bg-white/6"
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={openPicker}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "border-[var(--accent)]/60 ring-2 ring-[var(--accent)]/30" : ""
        } ${className ?? ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{formatYmdDisplay(value)}</span>
        <CalendarIcon />
      </button>
      {mounted && popover ? createPortal(popover, document.body) : null}
    </>
  );
}
