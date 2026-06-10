"use client";

import { useRef } from "react";
import { usePassVerticalWheel } from "@/hooks/usePassVerticalWheel";
import Image from "next/image";
import { useGsapScrollReveal } from "@/hooks/useGsapScrollReveal";
import { useSplitTextReveal } from "@/hooks/useSplitTextReveal";
import { useMasterCardHover } from "@/hooks/useMasterCardHover";
import { asset } from "@/lib/basePath";

export type LandingMaster = {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  badges: string[];
  description: string;
  photoPath?: string | null;
};

const CARD_GAP = 16;
const CARD_WIDTH = 320;

function Stars({ count }: { count: number }) {
  return (
    <span
      className="flex shrink-0 gap-0.5 text-[var(--accent)]"
      aria-label={`Рейтинг: ${count} из 5`}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="text-sm">
          ★
        </span>
      ))}
    </span>
  );
}

function MasterCard({ master }: { master: LandingMaster }) {
  return (
    <article
      data-reveal="card"
      data-master-card
      className="flex h-[460px] w-[min(86vw,320px)] shrink-0 snap-center flex-col overflow-hidden rounded-2xl bg-[var(--surface)] shadow-lg ring-1 ring-white/5 will-change-transform sm:h-[500px] sm:w-[320px]"
    >
      <div className="relative h-[168px] shrink-0 overflow-hidden sm:h-[178px]">
        <div data-master-photo className="absolute inset-0 origin-center">
          {master.photoPath ? (
            <Image
              src={asset(
                master.photoPath.startsWith("/") ? master.photoPath : `/${master.photoPath}`
              )}
              alt={master.name}
              fill
              className="object-cover"
              sizes="320px"
              unoptimized
            />
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(201,162,39,0.28) 0%, rgba(255,255,255,0.06) 38%, rgba(0,0,0,0.25) 100%)",
                }}
                aria-hidden
              />
              <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white/70">
                Фото скоро
              </div>
            </>
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-transparent to-transparent" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3.5">
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-[var(--text)]">{master.name}</h3>
            <Stars count={Math.round(master.rating)} />
          </div>
          <p className="mt-0.5 truncate text-sm text-white/75">{master.specialty}</p>
        </div>

        {master.badges.length > 0 && (
          <div className="mt-2 flex max-h-[52px] shrink-0 flex-wrap gap-1.5 overflow-hidden">
            {master.badges.map((b) => (
              <span
                key={b}
                className="rounded-full bg-[var(--accent)]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent)] ring-1 ring-[var(--accent)]/35"
              >
                {b}
              </span>
            ))}
          </div>
        )}

        <div className="relative mt-2.5 min-h-0 flex-1">
          <div data-master-desc className="scrollbar-theme h-full overflow-y-auto overscroll-y-contain pr-1">
            <p className="whitespace-pre-line text-sm leading-relaxed text-white/85">
              {master.description}
            </p>
          </div>
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-1 h-8 bg-gradient-to-t from-[var(--surface)] to-transparent"
            aria-hidden
          />
        </div>
      </div>
    </article>
  );
}

const DEFAULT_TITLE = "Наши мастера";
const DEFAULT_SUBTITLE = "Настроим стиль по форме лица, характеру и ритму жизни.";

export function MastersSection({
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  masters,
}: {
  title?: string;
  subtitle?: string;
  masters: LandingMaster[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useSplitTextReveal(sectionRef);
  useGsapScrollReveal(sectionRef, [
    { targets: "[data-reveal='subtitle']", y: 16, duration: 0.5, delay: 0.12 },
    { targets: "[data-reveal='card']", y: 32, x: 20, stagger: 0.08, delay: 0.1 },
  ], [masters.length]);
  useMasterCardHover(sectionRef);
  usePassVerticalWheel(sectionRef, "[data-master-desc]");

  const scroll = (direction: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = direction === "next" ? CARD_WIDTH + CARD_GAP : -(CARD_WIDTH + CARD_GAP);
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section id="masters" ref={sectionRef} className="h-full">
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-[var(--bg)]/55 px-4 py-6 shadow-xl ring-1 ring-white/10 sm:px-8 sm:py-8">
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(201,162,39,0.22) 0%, rgba(201,162,39,0.05) 45%, rgba(0,0,0,0) 70%)",
          }}
          aria-hidden
        />

        <div className="text-center">
          <h2 className="section-title" data-split-text>{title}</h2>
          <p className="mt-1 text-sm text-white/80 sm:text-base" data-reveal="subtitle">{subtitle}</p>
        </div>

        <div className="relative mt-5 sm:mt-6">
          {masters.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => scroll("prev")}
                className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[var(--surface)] bg-[var(--bg-content)]/95 text-[var(--text)] shadow-md backdrop-blur-sm transition hover:bg-[var(--surface)] sm:flex"
                aria-label="Предыдущий мастер"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => scroll("next")}
                className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[var(--surface)] bg-[var(--bg-content)]/95 text-[var(--text)] shadow-md backdrop-blur-sm transition hover:bg-[var(--surface)] sm:flex"
                aria-label="Следующий мастер"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div
            ref={scrollRef}
            className="horizontal-scroll flex items-stretch gap-4 overflow-x-auto overflow-y-hidden px-0.5 pb-2 scroll-smooth sm:px-12"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
          >
            {masters.map((master) => (
              <MasterCard key={master.id} master={master} />
            ))}
          </div>

          {masters.length > 1 && (
            <p className="mt-1 text-center text-xs text-white/45 sm:hidden">
              Листайте влево и вправо
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
