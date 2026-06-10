"use client";

import { useRef } from "react";
import { useGsapScrollReveal } from "@/hooks/useGsapScrollReveal";
import { useSplitTextReveal } from "@/hooks/useSplitTextReveal";
import { useSplitLinesReveal } from "@/hooks/useSplitLinesReveal";

const DEFAULT_TITLE = "О нас";
const DEFAULT_SUBTITLE = "Мужская парикмахерская с характером и вниманием к деталям.";
const DEFAULT_BADGES = ["Казань", "Атмосфера"];
const DEFAULT_PARAGRAPHS = [
  "Мужская парикмахерская — это место с индивидуальным подходом к личности каждого. Место для отдыха, где можно перевести дух от повседневной спешки, привести себя в порядок, услышать приятную музыку и хорошо побеседовать. Найдём именно твой образ — со вкусом.",
  "Здесь рады каждому, у кого добрые намерения и желание хорошо подстричься.",
];
const DEFAULT_TILES = [
  { label: "Подход", value: "Индивидуально под тебя" },
  { label: "Акцент", value: "Чёткие линии и стиль" },
  { label: "Сервис", value: "Комфорт + разговор по делу" },
];

export function AboutSection({
  title,
  subtitle,
  badges,
  paragraphs,
  tiles,
}: {
  title?: string;
  subtitle?: string;
  badges?: string[];
  paragraphs?: string[];
  tiles?: Array<{ label: string; value: string }>;
}) {
  const t = title ?? DEFAULT_TITLE;
  const st = subtitle ?? DEFAULT_SUBTITLE;
  const bd = badges && badges.length ? badges : DEFAULT_BADGES;
  const pg = paragraphs && paragraphs.length ? paragraphs : DEFAULT_PARAGRAPHS;
  const tl = tiles && tiles.length ? tiles : DEFAULT_TILES;
  const sectionRef = useRef<HTMLElement>(null);

  useSplitTextReveal(sectionRef);
  useSplitLinesReveal(sectionRef);
  useGsapScrollReveal(sectionRef, [
    { targets: "[data-reveal='subtitle']", y: 16, duration: 0.5, delay: 0.15 },
    { targets: "[data-reveal='badge']", y: 12, stagger: 0.08, delay: 0.1 },
    { targets: "[data-reveal='tile']", y: 32, stagger: 0.1, delay: 0.2 },
  ]);

  return (
    <section id="about" ref={sectionRef} className="h-full">
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-[var(--bg)]/55 px-4 py-6 shadow-xl ring-1 ring-white/10 sm:px-8 sm:py-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(201,162,39,0.28) 0%, rgba(201,162,39,0.06) 45%, rgba(0,0,0,0) 70%)",
          }}
          aria-hidden
        />

        <div className="relative">
          <div className="text-center">
            <h2 className="section-title" data-split-text>{t}</h2>
            <p className="mt-1 text-sm text-white/80 sm:text-base" data-reveal="subtitle">{st}</p>
          </div>

          <div
            className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:absolute sm:right-0 sm:top-0 sm:mt-0 sm:justify-end"
            aria-hidden
          >
            {bd.map((b) => (
              <span
                key={b}
                data-reveal="badge"
                className="rounded-full bg-[var(--accent)]/20 px-3 py-1 text-xs font-semibold text-[var(--accent)] ring-1 ring-[var(--accent)]/35"
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-4 text-white/85 sm:mt-6 sm:text-lg sm:leading-relaxed">
          {pg.map((p, i) => (
            <p key={i} data-split-lines>{p}</p>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-3">
          {tl.map((x) => (
            <div key={x.label} data-reveal="tile" className="rounded-xl bg-[var(--surface)] px-4 py-3">
              <div className="text-xs text-white/70">{x.label}</div>
              <div className="mt-1 text-sm font-semibold text-white">{x.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
