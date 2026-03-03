"use client";

import Link from "next/link";

const PHONE = "+79179359828";
const PHONE_DISPLAY = "+7 (917) 935-98-28";
const ADDRESS = "ул. Мансура Хасанова, 15, Казань";

export function Footer() {
  return (
    <footer className="border-t border-[var(--surface)] bg-[var(--bg)]/90 py-5 backdrop-blur-sm">
      <div className="container-landing space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-sm text-[var(--text-muted)] sm:gap-x-6">
          <a
            href={`tel:${PHONE}`}
            className="hover:text-[var(--accent)] hover:underline"
          >
            {PHONE_DISPLAY}
          </a>
          <span className="text-[var(--surface)]">·</span>
          <span>{ADDRESS}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-xs text-[var(--text-muted)] sm:text-sm">
          <span>© {new Date().getFullYear()} Мужская Парикмахерская</span>
          <span className="text-[var(--surface)]">·</span>
          <Link
            href="/privacy"
            className="hover:text-[var(--text)] hover:underline"
          >
            Политика конфиденциальности
          </Link>
        </div>
      </div>
    </footer>
  );
}
