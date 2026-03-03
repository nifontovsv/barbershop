"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--surface)] px-6 py-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
        <span className="text-sm text-[var(--text-muted)]">
          © {new Date().getFullYear()} Barbershop
        </span>
        <Link
          href="/privacy"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:underline"
        >
          Политика конфиденциальности
        </Link>
      </div>
    </footer>
  );
}
