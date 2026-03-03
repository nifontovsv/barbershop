"use client";

import type { Master } from "@/types/booking";

interface MasterStepProps {
  masters: Master[];
  selectedId: string | null;
  onSelect: (master: Master) => void;
}

export function MasterStep({ masters, selectedId, onSelect }: MasterStepProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-[var(--text)]">Выберите мастера</h3>
      <ul className="grid gap-2">
        {masters.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onSelect(m)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                selectedId === m.id
                  ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--text)]"
                  : "border-[var(--surface)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]/50"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-black">
                {m.name.charAt(0)}
              </span>
              <div>
                <span className="font-medium">{m.name}</span>
                <span className="ml-2 text-sm text-[var(--text-muted)]">
                  {m.specialty} · ★ {m.rating}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
