"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBase } from "@/lib/basePath";
import {
  formatSalonHoursRange,
  salonHourOptionsFrom,
  type SalonHoursConfig,
} from "@/lib/salonHours";

interface MasterOption {
  id: string;
  name: string;
}

interface ShiftRow {
  id: string;
  masterId: string;
  workDate: string;
  startHour: number;
  endHourExclusive: number;
  isDayOff: number;
}

const BTN_PRIMARY =
  "cursor-pointer rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SECONDARY =
  "cursor-pointer rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err?.message === "string" ? err.message : res.statusText);
  }
  return res.json() as Promise<T>;
}

function monthRange(ymd: string): { from: string; to: string } {
  const [y, m] = ymd.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export function AdminMasterSchedulePanel({
  masters,
  salonHours,
  selectedMasterId,
  onSelectMaster,
  initialDate,
  busy,
  setBusy,
  setErr,
  flashSaved,
  lockedMasterId = null,
}: {
  masters: MasterOption[];
  salonHours: SalonHoursConfig;
  selectedMasterId: string | null;
  onSelectMaster: (id: string) => void;
  initialDate: string;
  busy: boolean;
  setBusy: (b: boolean) => void;
  setErr: (s: string | null) => void;
  flashSaved: (msg?: string) => void;
  /** Для мастера — можно менять график только своего masterId */
  lockedMasterId?: string | null;
}) {
  const masterId = selectedMasterId ?? lockedMasterId ?? masters[0]?.id ?? "";
  const readOnly = !!lockedMasterId && masterId !== lockedMasterId;
  const [workDate, setWorkDate] = useState(initialDate);
  const [shift, setShift] = useState<ShiftRow | null | undefined>(undefined);
  const [isDayOff, setIsDayOff] = useState(false);
  const [startHour, setStartHour] = useState(salonHours.startHour);
  const [endHourExclusive, setEndHourExclusive] = useState(salonHours.endHourExclusive);
  const [monthShifts, setMonthShifts] = useState<ShiftRow[]>([]);

  const hourOptions = useMemo(() => salonHourOptionsFrom(salonHours), [salonHours]);

  const loadShift = useCallback(async () => {
    if (!masterId || !workDate) return;
    setShift(undefined);
    setErr(null);
    try {
      const { from, to } = monthRange(workDate);
      const rows = await fetchJson<ShiftRow[]>(
        `${apiBase}/api/admin/shifts?masterId=${encodeURIComponent(masterId)}&from=${from}&to=${to}`
      );
      setMonthShifts(rows);
      const day = rows.find((r) => r.workDate === workDate) ?? null;
      setShift(day);
      if (day) {
        setIsDayOff(day.isDayOff === 1);
        setStartHour(day.startHour);
        setEndHourExclusive(day.endHourExclusive);
      } else {
        setIsDayOff(false);
        setStartHour(salonHours.startHour);
        setEndHourExclusive(salonHours.endHourExclusive);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка загрузки");
      setShift(null);
    }
  }, [masterId, workDate, salonHours.startHour, salonHours.endHourExclusive, setErr]);

  useEffect(() => {
    void loadShift();
  }, [loadShift]);

  useEffect(() => {
    setWorkDate(initialDate);
  }, [initialDate]);

  const save = async () => {
    if (!masterId) {
      setErr("Выберите мастера");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/shifts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId,
          workDate,
          isDayOff,
          startHour,
          endHourExclusive: isDayOff ? salonHours.endHourExclusive : endHourExclusive,
        }),
      });
      await loadShift();
      flashSaved("График сохранён");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const resetDay = async () => {
    if (!masterId) return;
    if (!confirm("Сбросить индивидуальный график на этот день? Будут действовать правила по умолчанию.")) return;
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/shifts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterId, workDate, reset: true }),
      });
      await loadShift();
      flashSaved("Сброшено");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const shiftDaysInMonth = useMemo(() => new Set(monthShifts.map((s) => s.workDate)), [monthShifts]);

  if (!masters.length) {
    return (
      <p className="text-sm text-white/50">
        Сначала добавьте мастеров в разделе «Контент».
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/55">
        Для каждого мастера можно задать часы работы или выходной на конкретный день. Без настройки
        действует стандартный график салона ({formatSalonHoursRange(salonHours)}).
      </p>
      {readOnly ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Просмотр графика другого мастера. Изменять можно только свой график.
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/10 bg-[var(--surface)]/40 p-4">
        <label className="flex flex-col gap-1 text-xs text-white/65">
          Мастер
          <select
            value={masterId}
            onChange={(e) => onSelectMaster(e.target.value)}
            className="min-w-[180px] rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          >
            {masters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/65">
          Дата
          <input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)]/50 p-4">
          <h3 className="text-sm font-medium text-white/85">
            {workDate}
            {shift === undefined ? null : shift ? (
              <span className="ml-2 text-xs font-normal text-[var(--accent)]">индивидуальный график</span>
            ) : (
              <span className="ml-2 text-xs font-normal text-white/45">по умолчанию</span>
            )}
          </h3>

          {shift === undefined ? (
            <p className="mt-4 text-sm text-white/45">Загрузка…</p>
          ) : (
            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={isDayOff}
                  disabled={readOnly || busy}
                  onChange={(e) => setIsDayOff(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                Выходной (нет записи)
              </label>

              {!isDayOff ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-white/65">
                    Начало смены
                    <select
                      disabled={readOnly || busy}
                      value={startHour}
                      onChange={(e) => {
                        const h = Number(e.target.value);
                        setStartHour(h);
                        if (endHourExclusive <= h) setEndHourExclusive(h + 1);
                      }}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                    >
                      {hourOptions.map((h) => (
                        <option key={h} value={h}>
                          {h}:00
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-white/65">
                    Конец смены
                    <select
                      disabled={readOnly || busy}
                      value={endHourExclusive}
                      onChange={(e) => setEndHourExclusive(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                    >
                      {[...hourOptions, salonHours.endHourExclusive]
                        .filter((h) => h > startHour)
                        .map((h) => (
                          <option key={h} value={h}>
                            {h}:00
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              ) : null}

              {!readOnly ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <button type="button" disabled={busy} onClick={() => void save()} className={BTN_PRIMARY}>
                    Сохранить
                  </button>
                  {shift ? (
                    <button type="button" disabled={busy} onClick={() => void resetDay()} className={BTN_SECONDARY}>
                      Сбросить на этот день
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[var(--surface)]/50 p-4">
          <h3 className="text-sm font-medium text-white/85">Дни с настройкой в этом месяце</h3>
          {monthShifts.length === 0 ? (
            <p className="mt-3 text-sm text-white/45">Нет индивидуальных настроек</p>
          ) : (
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm scrollbar-theme">
              {monthShifts.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setWorkDate(s.workDate)}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                      s.workDate === workDate ? "bg-[var(--accent)]/15" : "hover:bg-white/5"
                    }`}
                  >
                    <span>{s.workDate}</span>
                    <span className="text-xs text-white/55">
                      {s.isDayOff === 1
                        ? "выходной"
                        : `${s.startHour}:00 – ${s.endHourExclusive}:00`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-white/40">
            В календаре журнала можно выбрать дату — она подставится сюда автоматически.
          </p>
          <p className="mt-1 text-xs text-white/40">
            Настроено дней в месяце: {shiftDaysInMonth.size}
          </p>
        </div>
      </div>
    </div>
  );
}
