"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DatePickerField } from "@/components/admin/DatePickerField";
import type { ScheduleBreak } from "@/components/admin/ScheduleDayView";
import { BREAK_DURATION_MINUTES, formatBreakDuration } from "@/lib/masterBreak";
import {
  formatSlotRange,
  isoToTimeInputValue,
  slotStartLocalYmd,
} from "@/lib/scheduleLayout";

export interface BreakJournalSavePayload {
  masterId: string;
  workDate: string;
  startTime: string;
  durationMinutes: number;
  comment: string | null;
}

function breakToForm(b: ScheduleBreak) {
  return {
    masterId: b.masterId,
    workDate: slotStartLocalYmd(b.slotStart),
    startTime: isoToTimeInputValue(b.slotStart),
    durationMinutes: b.durationMinutes,
    comment: b.comment ?? "",
  };
}

interface BreakJournalModalProps {
  breakRow: ScheduleBreak;
  masters: { id: string; name: string }[];
  isNew?: boolean;
  busy: boolean;
  lockedMasterId?: string | null;
  onClose: () => void;
  onSave: (payload: BreakJournalSavePayload) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function BreakJournalModal({
  breakRow,
  masters,
  isNew = false,
  busy,
  lockedMasterId = null,
  onClose,
  onSave,
  onDelete,
}: BreakJournalModalProps) {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState(() => breakToForm(breakRow));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setForm(breakToForm(breakRow));
  }, [breakRow.id, breakRow.slotStart, breakRow.durationMinutes, isNew]);

  const handleSave = async () => {
    await onSave({
      masterId: lockedMasterId ?? form.masterId,
      workDate: form.workDate,
      startTime: form.startTime,
      durationMinutes: form.durationMinutes,
      comment: form.comment.trim() || null,
    });
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm("Удалить технический перерыв?")) return;
    await onDelete();
  };

  const fieldClass =
    "mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[var(--accent)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40 disabled:opacity-50";
  const labelClass = "text-xs font-medium text-white/65";

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/55 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="break-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-(--bg-content) shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-(--surface)/90 px-4 py-3 sm:px-5">
          <div>
            <h2 id="break-modal-title" className="text-base font-semibold text-white/95">
              {isNew ? "Технический перерыв" : "Перерыв"}
            </h2>
            {!isNew ? (
              <p className="text-xs text-white/50">
                {formatSlotRange(breakRow.slotStart, breakRow.slotEnd)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-xl text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
          <label className={`block ${labelClass}`}>
            Специалист
            <select
              disabled={busy || !!lockedMasterId}
              value={lockedMasterId ?? form.masterId}
              onChange={(e) => setForm((f) => ({ ...f, masterId: e.target.value }))}
              className={fieldClass}
            >
              {masters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <label className={`block ${labelClass}`}>
            Дата
            <DatePickerField
              disabled={busy}
              value={form.workDate}
              onChange={(workDate) => setForm((f) => ({ ...f, workDate }))}
              className={fieldClass}
            />
          </label>

          <div>
            <p className={labelClass}>Время начала</p>
            <input
              type="time"
              disabled={busy}
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              className={fieldClass}
            />
          </div>

          <label className={`block ${labelClass}`}>
            Технический перерыв
            <select
              disabled={busy}
              value={form.durationMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))
              }
              className={fieldClass}
            >
              {BREAK_DURATION_MINUTES.map((m) => (
                <option key={m} value={m}>
                  {formatBreakDuration(m)}
                </option>
              ))}
            </select>
          </label>

          <label className={`block ${labelClass}`}>
            Комментарий
            <textarea
              disabled={busy}
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              rows={3}
              placeholder="Комментарий к перерыву"
              className={`${fieldClass} resize-none`}
            />
          </label>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-(--surface)/90 px-4 py-3 sm:px-5">
          {!isNew && onDelete ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDelete()}
              className="cursor-pointer rounded-lg border border-red-500/45 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Удалить
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy || !form.startTime}
            onClick={() => void handleSave()}
            className="cursor-pointer rounded-lg bg-(--accent) px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Сохранение…" : "✓ Сохранить"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
