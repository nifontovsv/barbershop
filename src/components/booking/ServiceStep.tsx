"use client";

import { useState } from "react";
import type { Service, ServiceCategory } from "@/types/booking";

interface ServiceStepProps {
  categories: ServiceCategory[];
  services: Service[];
  selectedIds: string[];
  onToggle: (service: Service) => void;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <span
      className="flex shrink-0 transition-transform duration-300 ease-out"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
      aria-hidden
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="text-[var(--accent)]"
        aria-hidden
      >
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function ServiceStep({ categories, services, selectedIds, onToggle }: ServiceStepProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const sortedCats = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));

  const groups: { key: string; title: string; list: Service[] }[] = [];

  if (sortedCats.length > 0) {
    for (const cat of sortedCats) {
      const list = services
        .filter((s) => s.categoryId === cat.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      if (list.length > 0) {
        groups.push({ key: cat.id, title: cat.name, list });
      }
    }
  }

  const inAny = new Set(groups.flatMap((g) => g.list.map((s) => s.id)));
  const rest = services
    .filter((s) => !inAny.has(s.id))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  if (rest.length > 0) {
    groups.push({
      key: "_other",
      title: sortedCats.length > 0 ? "Без категории" : "Услуги",
      list: rest,
    });
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-[var(--text)]">Выберите услуги</h3>
      {groups.map((group, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={group.key}
            className="overflow-hidden rounded-xl border border-[var(--surface)] bg-[var(--surface)]"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface)]/80"
              aria-expanded={isOpen}
            >
              <span>{group.title}</span>
              <ChevronIcon open={isOpen} />
            </button>
            <div
              className="grid transition-[grid-template-rows_0.3s_ease-out]"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="min-h-0 overflow-hidden">
                <ul className="grid gap-1 border-t border-[var(--surface)] p-2">
                  {group.list.map((s) => {
                    const checked = selectedIds.includes(s.id);
                    return (
                      <li key={s.id}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                            checked
                              ? "border-[var(--accent)] bg-[var(--accent)]/20"
                              : "border-transparent bg-[var(--bg)]/50 hover:border-[var(--accent)]/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggle(s)}
                            className="checkbox-accent"
                          />
                          <span className="flex-1 text-sm font-medium text-[var(--text)]">{s.name}</span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {s.durationMinutes} мин
                            {s.price != null ? ` · ${s.price.toLocaleString("ru-RU")} ₽` : ""}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
