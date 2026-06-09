"use client";

import { useEffect, useState } from "react";

const BTN_PRIMARY =
  "cursor-pointer rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SECONDARY =
  "cursor-pointer rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50";

export interface SlotBlockEditItem {
  id: string;
  blockDate: string;
  hour: number;
  masterLabel: string;
  note: string | null;
}

export function SlotBlockEditModal({
  block,
  busy,
  onClose,
  onSave,
}: {
  block: SlotBlockEditItem;
  busy: boolean;
  onClose: () => void;
  onSave: (note: string | null) => Promise<void>;
}) {
  const [note, setNote] = useState(block.note ?? "");

  useEffect(() => {
    setNote(block.note ?? "");
  }, [block.id, block.note]);

  const save = async () => {
    const trimmed = note.trim();
    await onSave(trimmed === "" ? null : trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-3 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-(--bg-content) p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="slot-block-edit-title"
      >
        <h2 id="slot-block-edit-title" className="text-base font-semibold text-white/95">
          Редактировать блокировку
        </h2>
        <p className="mt-1 text-sm text-white/55">
          {block.blockDate}, {String(block.hour).padStart(2, "0")}:00–{String(block.hour + 1).padStart(2, "0")}:00
          <span className="text-white/40"> · </span>
          {block.masterLabel}
        </p>

        <label className="mt-4 block text-xs text-white/65">
          Заметка
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Например: Обед"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            autoFocus
          />
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className={BTN_SECONDARY}>
            Отмена
          </button>
          <button type="button" disabled={busy} onClick={() => void save()} className={BTN_PRIMARY}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
