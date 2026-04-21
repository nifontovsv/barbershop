"use client";

import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/basePath";
import type { HeaderContent } from "@/lib/sitePublic";

interface HeaderProps extends Partial<HeaderContent> {
  onBookClick: () => void;
}

const DEFAULT_LOGO = "/logo.png";
const DEFAULT_TITLE = "Мужская Парикмахерская";
const DEFAULT_TEL = "+79179359828";
const DEFAULT_PHONE_DISPLAY = "+7 (917) 935-98-28";

export function Header({
  onBookClick,
  logoPath = DEFAULT_LOGO,
  title = DEFAULT_TITLE,
  phoneTel = DEFAULT_TEL,
  phoneDisplay = DEFAULT_PHONE_DISPLAY,
}: HeaderProps) {
  const logoSrc = asset(logoPath.startsWith("/") ? logoPath : `/${logoPath}`);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--surface)]/50 bg-[var(--bg)]/95 backdrop-blur-sm">
      <div className="container-landing flex h-16 items-center justify-between sm:h-[72px]">
        <Link href="/" className="flex min-w-0 shrink items-center gap-3" aria-label="На главную">
          <Image
            src={logoSrc}
            alt=""
            width={48}
            height={48}
            className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
            unoptimized
          />
          {title ? (
            <span className="hidden min-w-0 truncate font-semibold tracking-tight text-[var(--text)] sm:block sm:text-lg">
              {title}
            </span>
          ) : null}
        </Link>
        <div className="flex shrink-0 items-center gap-4">
          <a
            href={`tel:${phoneTel.replace(/\s/g, "")}`}
            className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] hover:underline sm:text-base"
          >
            {phoneDisplay}
          </a>
          <button
            type="button"
            onClick={onBookClick}
            className="animate-btn-glow relative cursor-pointer rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black shadow-[0_2px_12px_rgba(201,162,39,0.35)] transition-[transform,box-shadow,filter] duration-300 ease-out hover:scale-105 hover:brightness-110 hover:shadow-[0_6px_24px_rgba(201,162,39,0.55)] active:scale-[0.98] active:shadow-[0_1px_6px_rgba(201,162,39,0.3)] sm:px-5 sm:py-2.5 sm:text-base"
          >
            Записаться
          </button>
        </div>
      </div>
    </header>
  );
}
