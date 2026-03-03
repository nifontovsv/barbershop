"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import gsap from "gsap";
import type { Service, Master, TimeSlot } from "@/types/booking";
import { ServiceStep } from "./ServiceStep";
import { MasterStep } from "./MasterStep";
import { DateSlotStep } from "./DateSlotStep";
import { FormStep } from "./FormStep";

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

  const [selectedService, setSelectedService] = useState<Service | null>(null);
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
    fetch("/api/services")
      .then((r) => r.json())
      .then(setServices)
      .catch(() => setError("Не удалось загрузить услуги"));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedService) {
      setMasters([]);
      return;
    }
    fetch(`/api/masters?serviceId=${selectedService.id}`)
      .then((r) => r.json())
      .then(setMasters)
      .catch(() => setError("Не удалось загрузить мастеров"));
  }, [isOpen, selectedService]);

  const loadSlots = useCallback((masterId: string, dateStr: string) => {
    setLoadingSlots(true);
    setSlots([]);
    fetch(`/api/masters/${masterId}/slots?date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(Array.isArray(data) ? data : []);
      })
      .catch(() => setSlots([]))
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

  const handleSelectService = (s: Service) => {
    setSelectedService(s);
    setSelectedMaster(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep("master");
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
    if (!selectedMaster || !selectedService || !selectedSlot) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId: selectedMaster.id,
          serviceId: selectedService.id,
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
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--bg-content)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="booking-modal-title" className="text-xl font-semibold text-[var(--text)]">
            Запись к мастеру
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        {stepIndex > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="mb-4 text-sm text-[var(--accent)] hover:underline"
          >
            ← Назад
          </button>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {step === "service" && (
          <ServiceStep
            services={services}
            selectedId={selectedService?.id ?? null}
            onSelect={handleSelectService}
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
          <DateSlotStep
            slots={slots}
            selectedSlotId={selectedSlot?.id ?? null}
            onSelectSlot={setSelectedSlot}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            loading={loadingSlots}
          />
        )}
        {step === "form" && (
          <FormStep onSubmit={handleSubmitForm} isSubmitting={submitting} />
        )}

        {step === "date" && selectedSlot && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setStep("form")}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-black"
            >
              Далее →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
