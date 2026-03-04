"use client";

import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/basePath";

interface HeaderProps {
  onBookClick: () => void;
}

export function Header({ onBookClick }: HeaderProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--surface)]/50 bg-[var(--bg)]/95 backdrop-blur-sm">
      <div className="container-landing flex h-16 items-center justify-between sm:h-[72px]">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="На главную">
          <Image
            src={asset("/logo.png")}
            alt=""
            width={48}
            height={48}
            className="h-10 w-10 object-contain sm:h-12 sm:w-12"
            unoptimized
          />
          <span className="hidden font-semibold tracking-tight text-[var(--text)] sm:block sm:text-lg">
            Мужская Парикмахерская
          </span>
        </Link>
        <button
          type="button"
          onClick={onBookClick}
          className="animate-btn-glow relative cursor-pointer rounded-xl bg-[var(--accent)] px-5 py-2.5 text-base font-semibold text-black shadow-[0_2px_12px_rgba(201,162,39,0.35)] transition-[transform,box-shadow,filter] duration-300 ease-out hover:scale-105 hover:brightness-110 hover:shadow-[0_6px_24px_rgba(201,162,39,0.55)] active:scale-[0.98] active:shadow-[0_1px_6px_rgba(201,162,39,0.3)]"
        >
          Записаться
        </button>
      </div>
    </header>
  );
}
