"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IMaskInput } from "react-imask";
import type { Service } from "@/types/booking";
import type { ScheduleBooking } from "@/components/admin/ScheduleDayView";
import { DatePickerField } from "@/components/admin/DatePickerField";
import {
  isPhoneComplete,
  normalizeClientPhone,
  PHONE_MASK,
  phoneToUnmasked,
} from "@/lib/phoneInput";
import { BOOKING_STATUS_BUTTONS, getBookingStatusTheme } from "@/lib/bookingStatusTheme";
import {
  formatSlotRange,
  isoToTimeInputValue,
  slotStartLocalYmd,
} from "@/lib/scheduleLayout";

export interface BookingJournalSavePayload {
  masterId: string;
  serviceId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  comment: string | null;
  masterComment: string | null;
  status: string;
}

const DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;

function addMinutesToTime(time: string, minutes: number): string {
  const [hh, mm] = time.split(":").map(Number);
  const total = hh * 60 + mm + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function bookingToForm(b: ScheduleBooking) {
  return {
    masterId: b.masterId,
    serviceId: b.serviceId,
    workDate: slotStartLocalYmd(b.slotStart),
    startTime: isoToTimeInputValue(b.slotStart),
    endTime: isoToTimeInputValue(b.slotEnd),
    clientName: b.clientName,
    clientPhone: b.clientPhone,
    clientEmail: b.clientEmail ?? "",
    comment: b.comment ?? "",
    masterComment: b.masterComment ?? "",
    status: b.status,
  };
}

interface BookingJournalModalProps {
  booking: ScheduleBooking;
  masters: { id: string; name: string }[];
  services: Service[];
  isNew?: boolean;
  busy: boolean;
  lockedMasterId?: string | null;
  onClose: () => void;
  onSave: (payload: BookingJournalSavePayload) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function BookingJournalModal({
  booking,
  masters,
  services,
  isNew = false,
  busy,
  lockedMasterId = null,
  onClose,
  onSave,
  onDelete,
}: BookingJournalModalProps) {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState(() => bookingToForm(booking));
  const [phoneUnmasked, setPhoneUnmasked] = useState(() => phoneToUnmasked(booking.clientPhone));
  const [serviceQuery, setServiceQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setForm(bookingToForm(booking));
    setPhoneUnmasked(phoneToUnmasked(booking.clientPhone));
    setServiceQuery("");
  }, [booking.id, booking.slotStart, booking.status, booking.clientPhone, isNew]);

  const formDurationMin = useMemo(() => {
    const [sh, sm] = form.startTime.split(":").map(Number);
    const [eh, em] = form.endTime.split(":").map(Number);
    return Math.max(15, eh * 60 + em - (sh * 60 + sm));
  }, [form.startTime, form.endTime]);

  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, serviceQuery]);

  const setDuration = (minutes: number) => {
    setForm((f) => ({ ...f, endTime: addMinutesToTime(f.startTime, minutes) }));
  };

  const handleSave = async () => {
    await onSave({
      masterId: lockedMasterId ?? form.masterId,
      serviceId: form.serviceId,
      workDate: form.workDate,
      startTime: form.startTime,
      endTime: form.endTime,
      clientName: form.clientName.trim(),
      clientPhone: normalizeClientPhone(phoneUnmasked),
      clientEmail: form.clientEmail.trim() || null,
      comment: form.comment.trim() || null,
      masterComment: form.masterComment.trim() || null,
      status: form.status,
    });
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm("Удалить запись? Это действие нельзя отменить.")) return;
    await onDelete();
  };

  const fieldClass =
    "mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[var(--accent)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40 disabled:opacity-50";
  const labelClass = "text-xs font-medium text-white/65";

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-content)] shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-[var(--surface)]/90 px-4 py-3 sm:px-5">
          <div>
            <h2 id="booking-modal-title" className="text-base font-semibold text-white/95">
              {isNew ? "Новая запись" : "Запись"}
            </h2>
            {!isNew ? (
              <p className="text-xs text-white/50">{formatSlotRange(booking.slotStart, booking.slotEnd)}</p>
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

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-3">
          <section className="space-y-4 border-b border-white/10 bg-[var(--bg-content)] p-4 lg:border-b-0 lg:border-r">
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
              <p className={labelClass}>Время и длительность записи</p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="time"
                  disabled={busy}
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  className={fieldClass}
                />
                <input
                  type="time"
                  disabled={busy}
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <select
                disabled={busy}
                value={
                  DURATION_OPTIONS.includes(formDurationMin as (typeof DURATION_OPTIONS)[number])
                    ? formDurationMin
                    : 60
                }
                onChange={(e) => setDuration(Number(e.target.value))}
                className={`${fieldClass} mt-2`}
              >
                {DURATION_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m >= 60 ? `${m / 60} ч` : `${m} мин`}
                  </option>
                ))}
              </select>
            </div>

            <label className={`block ${labelClass}`}>
              Комментарий
              <textarea
                disabled={busy}
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                rows={4}
                placeholder="Комментарий к записи"
                className={`${fieldClass} resize-none`}
              />
            </label>

            <label className={`block ${labelClass}`}>
              Заметка мастера
              <textarea
                disabled={busy}
                value={form.masterComment}
                onChange={(e) => setForm((f) => ({ ...f, masterComment: e.target.value }))}
                rows={3}
                placeholder="Внутренняя заметка"
                className={`${fieldClass} resize-none`}
              />
            </label>
          </section>

          <section className="space-y-4 border-b border-white/10 bg-black/20 p-4 lg:border-b-0 lg:border-r">
            <div>
              <p className={`mb-2 ${labelClass}`}>Статус записи</p>
              <div className="flex flex-wrap gap-2">
                {BOOKING_STATUS_BUTTONS.map((s) => {
                  const active = form.status === s.value;
                  const statusTheme = getBookingStatusTheme(s.value);
                  return (
                    <button
                      key={s.value}
                      type="button"
                      disabled={busy}
                      onClick={() => setForm((f) => ({ ...f, status: s.value }))}
                      className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-default disabled:opacity-60 ${
                        active
                          ? statusTheme.modalActive + " ring-2 ring-white/25"
                          : "border-white/15 bg-black/25 text-white/65 hover:bg-white/8 hover:text-white/90"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className={`mb-2 ${labelClass}`}>Услуги</p>
              <input
                type="search"
                value={serviceQuery}
                onChange={(e) => setServiceQuery(e.target.value)}
                placeholder="Поиск по услугам"
                disabled={busy}
                className={fieldClass}
              />
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/25 scrollbar-theme">
                {filteredServices.map((s) => {
                  const selected = s.id === form.serviceId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setForm((f) => ({ ...f, serviceId: s.id }));
                        if (s.durationMinutes) setDuration(s.durationMinutes);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between border-b border-white/8 px-3 py-2.5 text-left text-sm last:border-0 disabled:cursor-default ${
                        selected
                          ? "bg-[var(--accent)]/20 font-medium text-[var(--accent)]"
                          : "text-white/80 hover:bg-white/6"
                      }`}
                    >
                      <span>{s.name}</span>
                      {s.price != null ? (
                        <span className="text-xs text-white/45">{s.price} ₽</span>
                      ) : null}
                    </button>
                  );
                })}
                {filteredServices.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-white/40">Услуги не найдены</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="space-y-4 bg-[var(--bg-content)] p-4">
            <label className={`block ${labelClass}`}>
              Имя
              <input
                disabled={busy}
                value={form.clientName}
                onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                placeholder="Иван"
                className={fieldClass}
              />
            </label>

            <label className={`block ${labelClass}`}>
              Телефон
              <IMaskInput
                mask={PHONE_MASK}
                unmask
                value={phoneUnmasked}
                onAccept={(value) => setPhoneUnmasked(String(value ?? ""))}
                disabled={busy}
                placeholder="+7 900 000-00-00"
                type="tel"
                inputMode="numeric"
                className={fieldClass}
              />
            </label>

            <label className={`block ${labelClass}`}>
              Email
              <input
                type="email"
                disabled={busy}
                value={form.clientEmail}
                onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
                placeholder="name@example.com"
                className={fieldClass}
              />
            </label>
          </section>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-[var(--surface)]/90 px-4 py-3 sm:px-5">
          {!isNew && onDelete ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDelete()}
              className="cursor-pointer rounded-lg border border-red-500/45 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Удалить запись
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy || !form.clientName.trim() || !isPhoneComplete(phoneUnmasked)}
            onClick={() => void handleSave()}
            className="cursor-pointer rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110 hover:shadow-md hover:shadow-[var(--accent)]/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Сохранение…" : "✓ Сохранить запись"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
