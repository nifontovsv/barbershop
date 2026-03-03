"use client";

import type { Service } from "@/types/booking";

interface ServiceStepProps {
  services: Service[];
  selectedId: string | null;
  onSelect: (service: Service) => void;
}

export function ServiceStep({ services, selectedId, onSelect }: ServiceStepProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-[var(--text)]">Выберите услугу</h3>
      <ul className="grid gap-2">
        {services.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                selectedId === s.id
                  ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--text)]"
                  : "border-[var(--surface)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]/50"
              }`}
            >
              <span className="font-medium">{s.name}</span>
              <span className="ml-2 text-sm text-[var(--text-muted)]">
                {s.durationMinutes} мин
                {s.price != null ? ` · ${s.price} ₽` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
