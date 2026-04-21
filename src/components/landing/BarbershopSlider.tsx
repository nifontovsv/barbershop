"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { asset } from "@/lib/basePath";

export type HeroSlide = { src: string; alt: string };

const FALLBACK_SLIDES: HeroSlide[] = Array.from({ length: 13 }, (_, i) => ({
  src: asset(`/images/barbershop/${i + 1}.jpg`),
  alt: `Парикмахерская — фото ${i + 1}`,
}));

const INTERVAL_MS = 5000;
const SWIPE_THRESHOLD = 50;

export function BarbershopSlider({ slides }: { slides?: HeroSlide[] }) {
  const list = useMemo(() => (slides && slides.length > 0 ? slides : FALLBACK_SLIDES), [slides]);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const idx = list.length ? Math.min(index, list.length - 1) : 0;

  const goTo = useCallback(
    (i: number) => {
      if (list.length === 0) return;
      const next = i < 0 ? list.length - 1 : i >= list.length ? 0 : i;
      setIndex(next);
    },
    [list.length]
  );

  useEffect(() => {
    const id = setInterval(() => goTo(idx + 1), INTERVAL_MS);
    return () => clearInterval(id);
  }, [idx, goTo]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const endX = e.changedTouches[0].clientX;
      const delta = touchStartX.current - endX;
      touchStartX.current = null;
      if (Math.abs(delta) < SWIPE_THRESHOLD) return;
      if (delta > 0) goTo(idx + 1);
      else goTo(idx - 1);
    },
    [idx, goTo]
  );

  const current = list[idx] ?? list[0];

  return (
    <section>
      <div className="relative w-full overflow-hidden rounded-2xl bg-[var(--surface)] shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:rounded-3xl">
        <div
          className="relative aspect-[16/10] w-full sm:aspect-[21/9]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            key={current.src}
            className="absolute inset-0 opacity-100 transition-opacity duration-500 ease-out"
          >
            <Image
              src={current.src}
              alt={current.alt}
              fill
              className="object-cover blur-xl brightness-90 scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1536px) 100vw, 1344px"
              quality={85}
              unoptimized
              priority={idx === 0}
            />
            <Image
              src={current.src}
              alt={current.alt}
              fill
              className="object-contain"
              sizes="(max-width: 640px) 100vw, (max-width: 1536px) 100vw, 1344px"
              quality={95}
              unoptimized
              priority={idx === 0}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => goTo(idx - 1)}
          className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 sm:flex md:left-4 md:h-12 md:w-12"
          aria-label="Предыдущий слайд"
        >
          <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => goTo(idx + 1)}
          className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 sm:flex md:right-4 md:h-12 md:w-12"
          aria-label="Следующий слайд"
        >
          <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center sm:bottom-4">
          <div className="rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm sm:px-3 sm:py-2">
            <div className="flex items-center gap-1 sm:gap-1.5">
              {list.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`cursor-pointer rounded-full transition-all ${
                    i === idx
                      ? "h-1.5 w-4 bg-[var(--accent)] sm:h-2 sm:w-6"
                      : "h-1.5 w-1.5 bg-white/60 hover:bg-white/90 sm:h-2 sm:w-2"
                  }`}
                  aria-label={`Слайд ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
