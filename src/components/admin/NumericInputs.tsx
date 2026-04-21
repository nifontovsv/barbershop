"use client";

import { useEffect, useState } from "react";

type IntFieldProps = {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  disabled?: boolean;
  /** Минимум после blur (включительно) */
  min?: number;
  /** Максимум после blur (включительно) */
  max?: number;
};

/**
 * Целое число: можно очистить поле при вводе; пустое при blur восстанавливает предыдущее value.
 */
export function IntField({ value, onChange, className, disabled, min, max }: IntFieldProps) {
  const [s, setS] = useState(String(value));
  useEffect(() => {
    setS(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const t = raw.trim();
    if (t === "") {
      setS(String(value));
      return;
    }
    let n = parseInt(t, 10);
    if (!Number.isFinite(n)) {
      setS(String(value));
      return;
    }
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    setS(String(n));
    onChange(n);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      disabled={disabled}
      className={className}
      value={s}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || /^-?\d*$/.test(v)) setS(v);
      }}
      onBlur={(e) => commit(e.target.value)}
    />
  );
}

type RatingFieldProps = {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  disabled?: boolean;
};

/**
 * Рейтинг 0–5; ввод как текст, при blur — ограничение диапазона и округление до 0.1.
 * Пустое поле при blur восстанавливает переданное value.
 */
export function RatingField({ value, onChange, className, disabled }: RatingFieldProps) {
  const [s, setS] = useState(String(value));
  useEffect(() => {
    setS(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const t = raw.trim();
    if (t === "") {
      setS(String(value));
      return;
    }
    let n = parseFloat(t);
    if (!Number.isFinite(n)) {
      setS(String(value));
      return;
    }
    n = Math.min(5, Math.max(0, n));
    n = Math.round(n * 10) / 10;
    setS(String(n));
    onChange(n);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      className={className}
      value={s}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || /^-?\d*\.?\d*$/.test(v)) setS(v);
      }}
      onBlur={(e) => commit(e.target.value)}
    />
  );
}
