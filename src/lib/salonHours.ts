/** Час начала работы салона по умолчанию (включительно) */
export const DEFAULT_SALON_SLOT_START_HOUR = 12;
/** Час окончания по умолчанию (не включая; слот 21:00–22:00 → 22) */
export const DEFAULT_SALON_SLOT_END_HOUR_EXCLUSIVE = 22;

/** @deprecated используйте DEFAULT_* или getSalonHoursConfig() */
export const SALON_SLOT_START_HOUR = DEFAULT_SALON_SLOT_START_HOUR;
/** @deprecated используйте DEFAULT_* или getSalonHoursConfig() */
export const SALON_SLOT_END_HOUR_EXCLUSIVE = DEFAULT_SALON_SLOT_END_HOUR_EXCLUSIVE;

export const SALON_HOURS_KV_KEY = "salon_hours";

export interface SalonHoursConfig {
  startHour: number;
  endHourExclusive: number;
}

export function defaultSalonHours(): SalonHoursConfig {
  return {
    startHour: DEFAULT_SALON_SLOT_START_HOUR,
    endHourExclusive: DEFAULT_SALON_SLOT_END_HOUR_EXCLUSIVE,
  };
}

export function parseSalonHoursJson(raw: string | null | undefined): SalonHoursConfig {
  if (!raw) return defaultSalonHours();
  try {
    const data = JSON.parse(raw) as Partial<SalonHoursConfig>;
    const startHour = Number(data.startHour);
    const endHourExclusive = Number(data.endHourExclusive);
    const config = {
      startHour: Number.isFinite(startHour) ? Math.floor(startHour) : DEFAULT_SALON_SLOT_START_HOUR,
      endHourExclusive: Number.isFinite(endHourExclusive)
        ? Math.floor(endHourExclusive)
        : DEFAULT_SALON_SLOT_END_HOUR_EXCLUSIVE,
    };
    return validateSalonHours(config) === null ? config : defaultSalonHours();
  } catch {
    return defaultSalonHours();
  }
}

export function validateSalonHours(config: SalonHoursConfig): string | null {
  const { startHour, endHourExclusive } = config;
  if (!Number.isInteger(startHour) || !Number.isInteger(endHourExclusive)) {
    return "Укажите целые часы";
  }
  if (startHour < 0 || startHour > 23) return "Начало работы: от 0:00 до 23:00";
  if (endHourExclusive < 1 || endHourExclusive > 24) return "Окончание: от 1:00 до 24:00";
  if (startHour >= endHourExclusive) return "Время окончания должно быть позже начала";
  return null;
}

export function salonHourOptionsFrom(config: SalonHoursConfig): number[] {
  const out: number[] = [];
  for (let h = config.startHour; h < config.endHourExclusive; h++) out.push(h);
  return out;
}

export function salonHourOptions(config?: SalonHoursConfig): number[] {
  return salonHourOptionsFrom(config ?? defaultSalonHours());
}

export function formatSalonHoursRange(config: SalonHoursConfig): string {
  return `${String(config.startHour).padStart(2, "0")}:00–${String(config.endHourExclusive).padStart(2, "0")}:00`;
}

/** Все часы для выбора в настройках */
export function allDayHourOptions(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}
