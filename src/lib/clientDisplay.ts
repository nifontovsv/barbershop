export type ClientVisitStatusFilter = "all" | "done" | "cancelled" | "planned";

export function lastVisitStatusLabel(status: string): string {
  if (status === "done") return "Пришёл";
  if (status === "cancelled") return "Не пришёл";
  if (status === "confirmed" || status === "pending") return "Запланирован";
  return "—";
}

export function lastVisitStatusClass(status: string): string {
  if (status === "done") return "text-emerald-400";
  if (status === "cancelled") return "text-red-300/90";
  if (status === "confirmed" || status === "pending") return "text-amber-300/90";
  return "text-white/50";
}

export function matchesClientVisitStatusFilter(
  lastVisitStatus: string,
  filter: ClientVisitStatusFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "done") return lastVisitStatus === "done";
  if (filter === "cancelled") return lastVisitStatus === "cancelled";
  return lastVisitStatus === "pending" || lastVisitStatus === "confirmed";
}
