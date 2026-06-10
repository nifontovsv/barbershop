"use client";

import { useRef } from "react";
import Image from "next/image";
import { useGsapEntrance } from "@/hooks/useGsapEntrance";
import { useHeaderScroll } from "@/hooks/useHeaderScroll";
import { useScrambleTextHover } from "@/hooks/useScrambleTextHover";
import Link from "next/link";
import { asset } from "@/lib/basePath";
import { scrollToSection } from "@/lib/gsapSetup";
import { SECTION_NAV } from "@/lib/sectionNav";
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
  const headerRef = useRef<HTMLElement>(null);
  const bookBtnRef = useRef<HTMLButtonElement>(null);

  useGsapEntrance(headerRef, [
    { targets: "[data-reveal='logo']", y: -12, duration: 0.5 },
    { targets: "[data-reveal='nav']", y: -8, duration: 0.5, delay: 0.08 },
    { targets: "[data-reveal='actions']", y: -8, duration: 0.5, delay: 0.12 },
  ]);
  useHeaderScroll(headerRef);
  useScrambleTextHover(bookBtnRef);

  return (
    <header
      ref={headerRef}
      className="header-bar fixed left-0 right-0 top-0 z-50 border-b border-[var(--surface)]/50 bg-[var(--bg)]/95 backdrop-blur-sm transition-[height,background,backdrop-filter] duration-300"
      style={{
        backdropFilter: "blur(var(--header-blur, 8px))",
        backgroundColor: "rgba(18, 18, 18, var(--header-bg-opacity, 0.95))",
      }}
    >
      <div className="container-landing flex h-16 items-center justify-between gap-4 sm:h-[72px]">
        <Link href="/" data-reveal="logo" className="flex min-w-0 shrink items-center gap-3" aria-label="На главную">
          <Image
            src={logoSrc}
            alt=""
            width={48}
            height={48}
            className="header-bar__logo h-10 w-10 shrink-0 object-contain transition-transform duration-300 sm:h-12 sm:w-12"
            unoptimized
          />
          {title ? (
            <span className="header-bar__title hidden min-w-0 truncate font-semibold tracking-tight text-[var(--text)] sm:block sm:text-lg">
              {title}
            </span>
          ) : null}
        </Link>

        <nav data-reveal="nav" className="hidden min-w-0 flex-1 items-center justify-center gap-5 lg:flex" aria-label="Разделы сайта">
          {SECTION_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(`#${item.id}`)}
              className="cursor-pointer whitespace-nowrap text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div data-reveal="actions" className="flex shrink-0 items-center gap-3 sm:gap-4">
          <a
            href={`tel:${phoneTel.replace(/\s/g, "")}`}
            className="hidden text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] hover:underline sm:inline sm:text-base"
          >
            {phoneDisplay}
          </a>
          <button
            ref={bookBtnRef}
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
