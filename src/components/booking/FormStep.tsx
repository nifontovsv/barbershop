"use client";

import { useState } from "react";
import { IMaskInput } from "react-imask";

interface FormStepProps {
  onSubmit: (data: { clientName: string; clientPhone: string; comment: string }) => void;
  isSubmitting: boolean;
}

const PHONE_MASK = "+{7} (000) 000-00-00";

export function FormStep({ onSubmit, isSubmitting }: FormStepProps) {
  const [name, setName] = useState("");
  const [phoneUnmasked, setPhoneUnmasked] = useState("");
  const [comment, setComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    if (phoneUnmasked.length < 10) return;
    const digits = phoneUnmasked.replace(/\D/g, "");
    const clientPhone = digits.length === 10 ? "7" + digits : digits;
    onSubmit({
      clientName: name.trim(),
      clientPhone,
      comment: comment.trim(),
    });
  };

  const phoneValid = phoneUnmasked.length >= 10;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--text)]">Ваши данные</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--text-muted)]">Имя</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Как к вам обращаться"
            className="w-full rounded-xl border border-[var(--surface)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            required
            minLength={2}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--text-muted)]">Телефон</span>
          <IMaskInput
            mask={PHONE_MASK}
            unmask
            defaultValue="+7 ("
            onAccept={(value) => setPhoneUnmasked(String(value ?? ""))}
            placeholder="+7 (999) 123-45-67"
            type="tel"
            className="w-full rounded-xl border border-[var(--surface)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--text-muted)]">Комментарий (необязательно)</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Пожелания к стрижке"
            rows={2}
            className="w-full resize-none rounded-xl border border-[var(--surface)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitting || name.trim().length < 2 || !phoneValid}
          className="mt-2 cursor-pointer rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Отправка…" : "Записаться"}
        </button>
      </form>
    </div>
  );
}
