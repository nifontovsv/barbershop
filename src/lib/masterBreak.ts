/** Длительности технического перерыва (как в YClients) */
export const BREAK_DURATION_MINUTES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60] as const;

export type BreakDurationMinutes = (typeof BREAK_DURATION_MINUTES)[number];

export function formatBreakDuration(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    const h = minutes / 60;
    return h === 1 ? "1 ч" : `${h} ч`;
  }
  return `${minutes} мин`;
}
