/** Час начала первого слота (включительно), по времени салона */
export const SALON_SLOT_START_HOUR = 12;
/** Час окончания последнего слота (слот 21:00–22:00 имеет hour = 21); верхняя граница цикла — не включая 22 */
export const SALON_SLOT_END_HOUR_EXCLUSIVE = 22;

export function salonHourOptions(): number[] {
  const out: number[] = [];
  for (let h = SALON_SLOT_START_HOUR; h < SALON_SLOT_END_HOUR_EXCLUSIVE; h++) {
    out.push(h);
  }
  return out;
}
