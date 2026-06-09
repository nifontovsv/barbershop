import type { SalonHoursConfig } from "./salonHours";

export interface MasterShiftInfo {
  startHour: number;
  endHourExclusive: number;
  isDayOff: boolean;
}

/** Рабочие часы мастера на дату с учётом индивидуального графика и правил по умолчанию (пн–пт). */
export function resolveMasterWorkHours(
  salonHours: SalonHoursConfig,
  workDate: string,
  shift: MasterShiftInfo | null | undefined
): { startHour: number; endHourExclusive: number } | null {
  if (shift) {
    if (shift.isDayOff) return null;
    return { startHour: shift.startHour, endHourExclusive: shift.endHourExclusive };
  }
  const [y, m, d] = workDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const day = new Date(y, m - 1, d).getDay();
  if (day === 0 || day === 6) return null;
  return { startHour: salonHours.startHour, endHourExclusive: salonHours.endHourExclusive };
}

/** Доступен ли час для записи к мастеру (в пределах графика салона и смены). */
export function isHourAvailableForMaster(
  hour: number,
  salonHours: SalonHoursConfig,
  workDate: string,
  shift: MasterShiftInfo | null | undefined
): boolean {
  if (hour < salonHours.startHour || hour >= salonHours.endHourExclusive) return false;
  const work = resolveMasterWorkHours(salonHours, workDate, shift);
  if (!work) return false;
  return hour >= work.startHour && hour < work.endHourExclusive;
}

/** Часы салона, когда мастер не работает по графику. */
export function offScheduleHoursForMaster(
  salonHours: SalonHoursConfig,
  workDate: string,
  shift: MasterShiftInfo | null | undefined
): number[] {
  const out: number[] = [];
  for (let h = salonHours.startHour; h < salonHours.endHourExclusive; h++) {
    if (!isHourAvailableForMaster(h, salonHours, workDate, shift)) out.push(h);
  }
  return out;
}
