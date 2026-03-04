"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import gsap from "gsap";
import type { Service, Master, TimeSlot } from "@/types/booking";
import { ServiceStep } from "./ServiceStep";
import { MasterStep } from "./MasterStep";
import { DateSlotStep } from "./DateSlotStep";
import { FormStep } from "./FormStep";
import { apiBase } from "@/lib/basePath";
import { FALLBACK_SERVICES, FALLBACK_MASTERS, getFallbackSlots } from "@/data/fallbackBooking";

const STEPS = ["service", "master", "date", "form"] as const;
type StepId = (typeof STEPS)[number];

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({ isOpen, onClose, onSuccess }: BookingModalProps) {
  const [step, setStep] = useState<StepId>("service");
  const [services, setServices] = useState<Service[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!overlayRef.current || !contentRef.current) return;
    if (isOpen) {
      setExiting(false);
      gsap.set(overlayRef.current, { opacity: 0 });
      gsap.set(contentRef.current, { scale: 0.95, opacity: 0 });
      gsap.to(overlayRef.current, { opacity: 1, duration: 0.2 });
      gsap.to(contentRef.current, { scale: 1, opacity: 1, duration: 0.25, ease: "power2.out" });
    }
  }, [isOpen]);

  useEffect(() => {
    const visible = isOpen || exiting;
    if (visible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    document.body.style.overflow = "";
  }, [isOpen, exiting]);

  const handleClose = useCallback(() => {
    if (!overlayRef.current || !contentRef.current) {
      onClose();
      return;
    }
    setExiting(true);
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.15 });
    gsap.to(contentRef.current, {
      scale: 0.95,
      opacity: 0,
      duration: 0.15,
      onComplete: () => {
        setExiting(false);
        onClose();
      },
    });
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    fetch(`${apiBase}/api/services`)
      .then((r) => {
        if (!r.ok) return FALLBACK_SERVICES;
        return r.json().then((data) => (Array.isArray(data) ? data : FALLBACK_SERVICES));
      })
      .then(setServices)
      .catch(() => setServices(FALLBACK_SERVICES));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || selectedServices.length === 0) {
      setMasters([]);
      return;
    }
    fetch(`${apiBase}/api/masters?serviceId=${selectedServices[0].id}`)
      .then((r) => {
        if (!r.ok) return FALLBACK_MASTERS;
        return r.json().then((data) => (Array.isArray(data) ? data : FALLBACK_MASTERS));
      })
      .then(setMasters)
      .catch(() => setMasters(FALLBACK_MASTERS));
  }, [isOpen, selectedServices]);

  const loadSlots = useCallback((masterId: string, dateStr: string) => {
    setLoadingSlots(true);
    setSlots([]);
    fetch(`${apiBase}/api/masters/${masterId}/slots?date=${dateStr}`)
      .then((r) => {
        if (!r.ok) return getFallbackSlots(masterId, dateStr);
        return r.json().then((data) =>
          Array.isArray(data) && data.length > 0 ? data : getFallbackSlots(masterId, dateStr)
        );
      })
      .then(setSlots)
      .catch(() => setSlots(getFallbackSlots(masterId, dateStr)))
      .finally(() => setLoadingSlots(false));
  }, []);

  useEffect(() => {
    if (!selectedMaster || !selectedDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }
    loadSlots(selectedMaster.id, selectedDate);
  }, [selectedMaster, selectedDate, loadSlots]);

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const handleToggleService = (s: Service) => {
    setSelectedServices((prev) =>
      prev.some((x) => x.id === s.id) ? prev.filter((x) => x.id !== s.id) : [...prev, s]
    );
  };

  const goToMasterFromService = () => {
    if (selectedServices.length > 0) {
      setSelectedMaster(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      setStep("master");
    }
  };

  const handleSelectMaster = (m: Master) => {
    setSelectedMaster(m);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep("date");
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
  };

  const handleSubmitForm = async (data: {
    clientName: string;
    clientPhone: string;
    comment: string;
  }) => {
    if (!selectedMaster || selectedServices.length === 0 || !selectedSlot) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId: selectedMaster.id,
          serviceId: selectedServices[0].id,
          slotId: selectedSlot.id,
          clientName: data.clientName,
          clientPhone: data.clientPhone,
          comment: data.comment || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || "Ошибка записи");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  };

  const visible = isOpen || exiting;
  if (!visible) return null;

  const stepIndex = STEPS.indexOf(step);
  const totalSum = selectedServices.reduce(
    (sum, s) => sum + (s.price != null ? s.price : 0),
    0
  );
  const hasTotal = selectedServices.length > 0 && selectedServices.some((s) => s.price != null);
  const showFooter =
    (step === "service" && selectedServices.length > 0) || hasTotal;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div
        ref={contentRef}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-[var(--bg-content)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 p-6 pb-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="booking-modal-title" className="text-xl font-semibold text-[var(--text)]">
              Запись к мастеру
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>

          {stepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="cursor-pointer mb-4 text-sm text-[var(--accent)] hover:underline"
            >
              ← Назад
            </button>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="scrollbar-theme min-h-0 flex-1 overflow-y-auto p-6 pt-4">
          {step === "service" && (
            <ServiceStep
              services={services}
              selectedIds={selectedServices.map((s) => s.id)}
              onToggle={handleToggleService}
            />
          )}
          {step === "master" && (
            <MasterStep
              masters={masters}
              selectedId={selectedMaster?.id ?? null}
              onSelect={handleSelectMaster}
            />
          )}
          {step === "date" && selectedMaster && (
            <>
              <DateSlotStep
                slots={slots}
                selectedSlotId={selectedSlot?.id ?? null}
                onSelectSlot={setSelectedSlot}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                loading={loadingSlots}
              />
              {selectedSlot && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="w-full cursor-pointer rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-black"
                  >
                    Далее →
                  </button>
                </div>
              )}
            </>
          )}
          {step === "form" && (
            <FormStep onSubmit={handleSubmitForm} isSubmitting={submitting} />
          )}
        </div>

        {showFooter && (
          <footer className="sticky bottom-0 shrink-0 border-t border-[var(--surface)] bg-[var(--bg-content)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {hasTotal && (
                <div className="flex items-center justify-between sm:block">
                  <span className="text-sm text-[var(--text-muted)]">Итого</span>
                  <span className="text-lg font-semibold text-[var(--text)] sm:ml-2">
                    {totalSum.toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              )}
              {step === "service" && selectedServices.length > 0 && (
                <button
                  type="button"
                  onClick={goToMasterFromService}
                  className="w-full cursor-pointer rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-black transition-opacity hover:opacity-90 sm:w-auto sm:min-w-[140px]"
                >
                  Далее →
                </button>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
