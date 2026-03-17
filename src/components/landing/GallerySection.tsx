"use client";

import Image from "next/image";
import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { asset } from "@/lib/basePath";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const DESIGN_IMAGES = Array.from({ length: 19 }, (_, i) => i + 1);
const PRODUCT_IMAGES = Array.from({ length: 21 }, (_, i) => i + 1);
const CLIENT_IMAGES = [1, 2, 3, 4, 5, 6, 7, 9];

type GalleryTab = "design" | "products" | "clients";

const TABS: Array<{ id: GalleryTab; label: string; subtitle: string }> = [
  { id: "design", label: "Интерьер", subtitle: "Атмосфера и детали" },
  { id: "products", label: "Товары", subtitle: "Уход и стайлинг" },
  { id: "clients", label: "Клиенты", subtitle: "Наши работы" },
];

export function GallerySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<GalleryTab>("design");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          scrollTrigger: { trigger: section, start: "top 85%" },
        }
      );
      gsap.fromTo(
        gridRef.current?.children ?? [],
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.05,
          scrollTrigger: { trigger: section, start: "top 80%" },
        }
      );
    }, section);
    return () => ctx.revert();
  }, []);

  const items = useMemo(() => {
    if (tab === "design") {
      return DESIGN_IMAGES.map((n) => ({
        key: `design-${n}`,
        src: asset(`/images/design/${n}.jpg`),
        alt: `Интерьер — фото ${n}`,
      }));
    }
    if (tab === "products") {
      return PRODUCT_IMAGES.map((n) => ({
        key: `product-${n}`,
        src: asset(`/images/products/${n}.jpg`),
        alt: `Товар — фото ${n}`,
      }));
    }
    return CLIENT_IMAGES.map((n) => ({
      key: `client-${n}`,
      src: asset(`/images/clients/${n}.webp`),
      alt: `Клиент — фото ${n}`,
    }));
  }, [tab]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const goLightbox = useCallback(
    (delta: number) => {
      setLightboxIndex((cur) => {
        if (cur === null) return cur;
        const next = (cur + delta + items.length) % items.length;
        return next;
      });
    },
    [items.length]
  );

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goLightbox(-1);
      if (e.key === "ArrowRight") goLightbox(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeLightbox, goLightbox, lightboxIndex]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [lightboxIndex]);

  return (
    <section
      ref={sectionRef}
      className="scroll-section relative left-1/2 right-1/2 -mx-[50vw] w-screen border-y border-[var(--surface)] bg-transparent"
    >
      <div className="container-landing py-5 sm:py-8">
        <div className="w-full rounded-2xl bg-[var(--bg)]/55 px-4 py-6 shadow-xl sm:px-7 sm:py-8">
        <h2
          ref={titleRef}
          className="section-title"
        >
          Галерея
        </h2>
        <p className="mt-2 text-center text-sm text-[var(--text-muted)] sm:text-base">
          Интерьер, товары и наши клиенты — листайте и вдохновляйтесь.
        </p>

        <div className="mt-4 -mx-4 flex flex-nowrap items-stretch gap-2 overflow-x-auto px-4 pb-1 scrollbar-theme sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setLightboxIndex(null);
              }}
              className={`group shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:px-5 sm:py-2.5 sm:text-base ${
                tab === t.id
                  ? "bg-[var(--accent)] text-black"
                  : "bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--accent)] hover:text-black"
              }`}
              aria-pressed={tab === t.id}
            >
              <span className="block leading-tight">{t.label}</span>
              <span className="hidden">
                {t.subtitle}
              </span>
            </button>
          ))}
        </div>
        {/* Mobile: swipeable row. Desktop: grid */}
        <div className="mt-5 sm:mt-6">
          <div
            ref={gridRef}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-theme sm:hidden"
          >
            {items.map((item, i) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="relative aspect-square w-[78%] shrink-0 snap-center overflow-hidden rounded-xl bg-[var(--surface)] text-left"
                aria-label={`Открыть: ${item.alt}`}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  className="object-cover"
                  sizes="80vw"
                  unoptimized
                />
              </button>
            ))}
          </div>

          <div className="hidden grid-cols-4 gap-2 sm:grid sm:gap-3">
            <div className="col-span-full max-h-[min(720px,70vh)] overflow-y-auto pr-1 scrollbar-theme">
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {items.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-[var(--surface)] text-left"
                    aria-label={`Открыть: ${item.alt}`}
                  >
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      unoptimized
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {lightboxIndex !== null && items[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фото"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) closeLightbox();
          }}
        >
          <div className="relative h-full w-full">
            <Image
              src={items[lightboxIndex].src}
              alt={items[lightboxIndex].alt}
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized
            />

            {/* Большие зоны перелистывания: кликом по левой/правой части */}
            <button
              type="button"
              onClick={() => goLightbox(-1)}
              className="group absolute left-0 top-0 h-full w-1/2 cursor-pointer"
              aria-label="Предыдущее фото"
              title="Предыдущее"
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/10 via-white/0 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-sm font-medium text-white/90 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                ←
              </span>
            </button>
            <button
              type="button"
              onClick={() => goLightbox(1)}
              className="group absolute right-0 top-0 h-full w-1/2 cursor-pointer"
              aria-label="Следующее фото"
              title="Следующее"
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-l from-white/10 via-white/0 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-sm font-medium text-white/90 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                →
              </span>
            </button>

            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-3 top-3 rounded-full bg-black/45 px-3 py-2 text-sm font-medium text-white/90 backdrop-blur-sm transition hover:bg-black/60 sm:right-5 sm:top-5"
              aria-label="Закрыть"
              title="Закрыть"
            >
              ✕
            </button>

            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 bg-black/35 px-4 py-3 text-xs text-white/80 backdrop-blur-sm sm:px-6 sm:text-sm">
              <span className="truncate">{items[lightboxIndex].alt}</span>
              <span className="shrink-0">
                {lightboxIndex + 1} / {items.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
