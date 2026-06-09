"use client";

import { useEffect, useState } from "react";
import { apiBase } from "@/lib/basePath";
import {
  allDayHourOptions,
  formatSalonHoursRange,
  type SalonHoursConfig,
} from "@/lib/salonHours";

const BTN_PRIMARY =
  "cursor-pointer rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

export function SalonHoursEditor({
  config,
  busy,
  setBusy,
  setErr,
  onSaved,
}: {
  config: SalonHoursConfig;
  busy: boolean;
  setBusy: (b: boolean) => void;
  setErr: (s: string | null) => void;
  onSaved: (config: SalonHoursConfig) => void;
}) {
  const [startHour, setStartHour] = useState(config.startHour);
  const [endHourExclusive, setEndHourExclusive] = useState(config.endHourExclusive);

  useEffect(() => {
    setStartHour(config.startHour);
    setEndHourExclusive(config.endHourExclusive);
  }, [config.startHour, config.endHourExclusive]);

  const hourOptions = allDayHourOptions();
  const endOptions = hourOptions.filter((h) => h > startHour);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/salon-hours`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ startHour, endHourExclusive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.message === "string" ? data.message : "Ошибка сохранения");
      }
      onSaved(data as SalonHoursConfig);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const dirty =
    startHour !== config.startHour || endHourExclusive !== config.endHourExclusive;

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)]/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-white/90">Режим работы салона</h3>
          <p className="mt-1 text-sm text-white/55">
            Диапазон часов для журнала записи, блокировки слотов и онлайн-записи на сайте.
            Сейчас: {formatSalonHoursRange(config)}.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={() => void save()}
          className={BTN_PRIMARY}
        >
          Сохранить
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/65">
          Начало работы
          <select
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
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-white/65">
          Окончание (не включая)
          <select
            value={endHourExclusive}
            onChange={(e) => setEndHourExclusive(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          >
            {endOptions.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>
      </div>

      {dirty ? (
        <p className="mt-3 text-xs text-[var(--accent)]">
          Новый режим: {formatSalonHoursRange({ startHour, endHourExclusive })}
        </p>
      ) : null}
    </div>
  );
}
