export const WEEKDAY_NAMES_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

export const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

export function ymdFromParts(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function getCalendarDays(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startWeekday = first.getDay();
  const startOffset = startWeekday === 0 ? 6 : startWeekday - 1;
  const daysInMonth = last.getDate();
  const result: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) result.push(null);
  for (let d = 1; d <= daysInMonth; d++) result.push(d);
  const remainder = result.length % 7;
  if (remainder) {
    for (let i = 0; i < 7 - remainder; i++) result.push(null);
  }
  return result;
}

export interface CalendarCell {
  day: number;
  month: number;
  year: number;
  inCurrentMonth: boolean;
}

export function getCalendarCells(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startWeekday = first.getDay();
  const startOffset = startWeekday === 0 ? 6 : startWeekday - 1;
  const daysInMonth = last.getDate();
  const cells: CalendarCell[] = [];

  const prevLast = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = prevLast - i;
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    cells.push({ day, month: pm, year: py, inCurrentMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, inCurrentMonth: true });
  }

  const remainder = cells.length % 7;
  if (remainder) {
    const count = 7 - remainder;
    for (let d = 1; d <= count; d++) {
      const nm = month === 11 ? 0 : month + 1;
      const ny = month === 11 ? year + 1 : year;
      cells.push({ day: d, month: nm, year: ny, inCurrentMonth: false });
    }
  }

  return cells;
}

export function formatYmdDisplay(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}.${m}.${y}`;
}
