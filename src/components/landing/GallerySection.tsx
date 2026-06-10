"use client";

import Image from "next/image";
import { useMemo, useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { asset } from "@/lib/basePath";
import { useGsapScrollReveal } from "@/hooks/useGsapScrollReveal";
import { useSplitTextReveal } from "@/hooks/useSplitTextReveal";
import { gsap, prefersReducedMotion } from "@/lib/gsapSetup";

export type GalleryTab = "design" | "products" | "clients";

const DEFAULT_TABS: Array<{ id: GalleryTab; label: string; subtitle: string }> = [
  { id: "design", label: "Интерьер", subtitle: "Атмосфера и детали" },
  { id: "products", label: "Товары", subtitle: "Уход и стайлинг" },
  { id: "clients", label: "Клиенты", subtitle: "Наши работы" },
];

export type GalleryItem = { key: string; src: string; alt: string };

const TAB_ITEM_STAGGER = 0.05;
const TAB_ITEM_DURATION = 0.48;

function getActiveGalleryItems(wrap: HTMLElement): HTMLElement[] {
  const isDesktop = window.matchMedia("(min-width: 640px)").matches;
  const track = wrap.querySelector<HTMLElement>(
    isDesktop ? '[data-gallery-track="desktop"]' : '[data-gallery-track="mobile"]'
  );
  return track ? Array.from(track.querySelectorAll<HTMLElement>("[data-gallery-item]")) : [];
}

function animateGalleryItemsIn(wrap: HTMLElement, onComplete?: () => void) {
  const items = getActiveGalleryItems(wrap);
  if (!items.length) {
    onComplete?.();
    return;
  }

  gsap.killTweensOf(items);
  gsap.set(items, { autoAlpha: 0, x: -36, visibility: "visible", clipPath: "none" });
  gsap.to(items, {
    autoAlpha: 1,
    x: 0,
    duration: TAB_ITEM_DURATION,
    stagger: { each: TAB_ITEM_STAGGER, from: "start" },
    ease: "power2.out",
    onComplete,
  });
}

function fallbackItems(tab: GalleryTab): GalleryItem[] {
  if (tab === "design") {
    return Array.from({ length: 19 }, (_, i) => i + 1).map((n) => ({
      key: `design-${n}`,
      src: asset(`/images/design/${n}.jpg`),
      alt: `Интерьер — фото ${n}`,
    }));
  }
  if (tab === "products") {
    return Array.from({ length: 21 }, (_, i) => i + 1).map((n) => ({
      key: `product-${n}`,
      src: asset(`/images/products/${n}.jpg`),
      alt: `Товар — фото ${n}`,
    }));
  }
  return [1, 2, 3, 4, 5, 6, 7, 9].map((n) => ({
    key: `client-${n}`,
    src: asset(`/images/clients/${n}.webp`),
    alt: `Клиент — фото ${n}`,
  }));
}

export function GallerySection({
  sectionTitle = "Галерея",
  sectionSubtitle = "Интерьер, товары и наши клиенты — листайте и вдохновляйтесь.",
  tabs = DEFAULT_TABS,
  itemsByTab,
}: {
  sectionTitle?: string;
  sectionSubtitle?: string;
  tabs?: Array<{ id: GalleryTab; label: string; subtitle: string }>;
  itemsByTab: Record<GalleryTab, GalleryItem[]>;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const galleryGridWrapRef = useRef<HTMLDivElement>(null);
  const tabList = tabs.length ? tabs : DEFAULT_TABS;
  const initialTab = tabList[0]?.id ?? "design";
  const activeTabRef = useRef<GalleryTab>(initialTab);
  const skipTabAnimateRef = useRef(true);
  const [tab, setTab] = useState<GalleryTab>(initialTab);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const activeTab: GalleryTab = tabList.some((t) => t.id === tab)
    ? tab
    : (tabList[0]?.id ?? "design");

  useSplitTextReveal(sectionRef);
  useGsapScrollReveal(sectionRef, [
    { targets: "[data-reveal='subtitle']", y: 16, duration: 0.5, delay: 0.12 },
    { targets: "[data-reveal='tab']", y: 12, stagger: 0.06, delay: 0.1 },
    { targets: "[data-gallery-item]", y: 24, stagger: 0.04, delay: 0.15, clipReveal: true },
  ]);

  const killGalleryTweens = useCallback(() => {
    const wrap = galleryGridWrapRef.current;
    if (!wrap) return;
    gsap.killTweensOf(wrap);
    gsap.killTweensOf(getActiveGalleryItems(wrap));
  }, []);

  const changeTab = useCallback(
    (id: GalleryTab) => {
      if (id === activeTabRef.current) return;

      activeTabRef.current = id;
      killGalleryTweens();
      setTab(id);
      setLightboxIndex(null);
    },
    [killGalleryTweens]
  );

  useLayoutEffect(() => {
    if (skipTabAnimateRef.current) {
      skipTabAnimateRef.current = false;
      return;
    }
    if (prefersReducedMotion()) return;

    const wrap = galleryGridWrapRef.current;
    if (!wrap) return;

    gsap.set(wrap, { autoAlpha: 1, y: 0 });
    animateGalleryItemsIn(wrap);
  }, [activeTab]);

  const items = useMemo(() => {
    const rows = itemsByTab[activeTab];
    if (rows && rows.length > 0) return rows;
    return fallbackItems(activeTab);
  }, [activeTab, itemsByTab]);

  useEffect(() => {
    gridRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [activeTab]);

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
      id="gallery"
      ref={sectionRef}
      className="scroll-section relative left-1/2 right-1/2 -mx-[50vw] w-screen border-y border-[var(--surface)] bg-transparent"
    >
      <div className="container-landing py-5 sm:py-8">
        <div className="w-full rounded-2xl bg-[var(--bg)]/55 px-4 py-6 shadow-xl sm:px-7 sm:py-8">
          <h2 data-split-text className="section-title">
            {sectionTitle}
          </h2>
          <p
            data-reveal="subtitle"
            className="mt-2 text-center text-sm text-[var(--text-muted)] sm:text-base"
          >
            {sectionSubtitle}
          </p>

          <div className="mt-4 -mx-4 flex flex-nowrap items-stretch gap-2 overflow-x-auto px-4 pb-1 scrollbar-theme sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
            {tabList.map((t) => (
              <button
                key={t.id}
                data-reveal="tab"
                type="button"
                onClick={() => changeTab(t.id)}
                className={`group shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:px-5 sm:py-2.5 sm:text-base ${
                  activeTab === t.id
                    ? "bg-[var(--accent)] text-black"
                    : "bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--accent)] hover:text-black"
                }`}
                aria-pressed={activeTab === t.id}
              >
                <span className="block leading-tight">{t.label}</span>
                <span className="hidden">{t.subtitle}</span>
              </button>
            ))}
          </div>

          <div ref={galleryGridWrapRef} className="mt-5 sm:mt-6">
            <div
              ref={gridRef}
              data-gallery-track="mobile"
              className="horizontal-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-theme sm:hidden"
            >
              {items.map((item, i) => (
                <button
                  key={item.key}
                  data-gallery-item
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

            <div data-gallery-track="desktop" className="hidden grid-cols-4 gap-2 sm:grid sm:gap-3">
              {items.map((item, i) => (
                <button
                  key={item.key}
                  data-gallery-item
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

      {lightboxIndex !== null &&
        items[lightboxIndex] &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] h-[100dvh] w-screen bg-black/92 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Просмотр фото"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeLightbox();
              }}
              className="group absolute right-3 top-3 z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/45 text-lg font-medium text-white/80 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-white/25 hover:bg-white/15 hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.12)] active:scale-95 sm:right-5 sm:top-5 sm:h-11 sm:w-11"
              aria-label="Закрыть"
              title="Закрыть"
            >
              <span className="transition-transform duration-200 group-hover:rotate-90">✕</span>
            </button>

            <div className="absolute inset-x-0 top-12 bottom-14 z-10 flex min-h-0 items-center sm:bottom-16 sm:top-14">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goLightbox(-1);
                }}
                className="group relative flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center border-0 bg-transparent p-0"
                aria-label="Предыдущее фото"
                title="Предыдущее"
              >
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/16 via-white/6 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-active:opacity-100"
                  aria-hidden
                />
                <span className="relative text-2xl text-white/60 transition-colors duration-200 group-hover:text-white sm:text-3xl">
                  ←
                </span>
              </button>

              <div className="relative shrink-0 cursor-default">
                <Image
                  src={items[lightboxIndex].src}
                  alt={items[lightboxIndex].alt}
                  width={2000}
                  height={1500}
                  className="block h-auto max-h-[calc(100dvh-7rem)] w-auto max-w-[min(92vw,1600px)] object-contain"
                  sizes="100vw"
                  unoptimized
                  priority
                />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goLightbox(1);
                }}
                className="group relative flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center border-0 bg-transparent p-0"
                aria-label="Следующее фото"
                title="Следующее"
              >
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-l from-white/16 via-white/6 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-active:opacity-100"
                  aria-hidden
                />
                <span className="relative text-2xl text-white/60 transition-colors duration-200 group-hover:text-white sm:text-3xl">
                  →
                </span>
              </button>
            </div>

            <div
              className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 bg-black/50 px-4 py-3 text-xs text-white/85 backdrop-blur-sm sm:px-6 sm:text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="truncate">{items[lightboxIndex].alt}</span>
              <span className="shrink-0">
                {lightboxIndex + 1} / {items.length}
              </span>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
