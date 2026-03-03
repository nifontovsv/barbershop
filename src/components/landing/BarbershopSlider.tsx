"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

const SLIDES = Array.from({ length: 10 }, (_, i) => i + 1);
const INTERVAL_MS = 5000;

export function BarbershopSlider() {
  const [index, setIndex] = useState(0);

  const goTo = useCallback((i: number) => {
    const next = i < 0 ? SLIDES.length - 1 : i >= SLIDES.length ? 0 : i;
    setIndex(next);
  }, []);

  useEffect(() => {
    const id = setInterval(() => goTo(index + 1), INTERVAL_MS);
    return () => clearInterval(id);
  }, [index, goTo]);

  return (
    <section>
      <div className="relative w-full overflow-hidden rounded-2xl bg-[var(--surface)] shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:rounded-3xl">
        <div className="relative aspect-[16/10] w-full sm:aspect-[21/9]">
          {SLIDES.map((n, i) => (
            <div
              key={n}
              className="absolute inset-0 transition-opacity duration-500 ease-out"
              style={{
                opacity: i === index ? 1 : 0,
                zIndex: i === index ? 1 : 0,
              }}
            >
              <Image
                src={`/images/barbershop/${n}.webp`}
                alt={`Парикмахерская — фото ${n}`}
                fill
                className="object-cover"
                sizes="(max-width: 1536px) 100vw, 1344px"
                priority={i === 0}
              />
            </div>
          ))}
        </div>
        {/* Стрелки */}
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 md:left-4 md:h-12 md:w-12"
          aria-label="Предыдущий слайд"
        >
          <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 md:right-4 md:h-12 md:w-12"
          aria-label="Следующий слайд"
        >
          <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {/* Точки в подложке */}
        <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center">
          <div className="rounded-full bg-black/40 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`cursor-pointer rounded-full transition-all ${
                    i === index
                      ? "h-2 w-6 bg-[var(--accent)]"
                      : "h-2 w-2 bg-white/60 hover:bg-white/90"
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
