"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { flushSync } from "react-dom";
import { asset } from "@/lib/basePath";
import { gsap, prefersReducedMotion } from "@/lib/gsapSetup";
import { useGsapEntrance } from "@/hooks/useGsapEntrance";

export type HeroSlide = { src: string; alt: string };

const FALLBACK_SLIDES: HeroSlide[] = Array.from({ length: 13 }, (_, i) => ({
  src: asset(`/images/barbershop/${i + 1}.jpg`),
  alt: `Парикмахерская — фото ${i + 1}`,
}));

const INTERVAL_MS = 6000;
const CROSSFADE_DURATION = 1.35;
const MANUAL_CROSSFADE_DURATION = 0.65;
const SWIPE_THRESHOLD = 50;

function SlideImages({ slide }: { slide: HeroSlide }) {
  return (
    <>
      <Image
        src={slide.src}
        alt=""
        fill
        className="object-cover blur-xl brightness-90 scale-110"
        sizes="(max-width: 640px) 100vw, (max-width: 1536px) 100vw, 1344px"
        quality={85}
        unoptimized
        aria-hidden
      />
      <div className="slide-kenburns absolute inset-0 origin-center will-change-transform">
        <Image
          src={slide.src}
          alt={slide.alt}
          fill
          className="object-contain"
          sizes="(max-width: 640px) 100vw, (max-width: 1536px) 100vw, 1344px"
          quality={95}
          unoptimized
        />
      </div>
    </>
  );
}

export function BarbershopSlider({ slides }: { slides?: HeroSlide[] }) {
  const list = useMemo(() => (slides && slides.length > 0 ? slides : FALLBACK_SLIDES), [slides]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [layerIndices, setLayerIndices] = useState<[number, number]>([0, 0]);
  const [visibleLayer, setVisibleLayer] = useState<0 | 1>(0);

  const touchStartX = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const layer0Ref = useRef<HTMLDivElement>(null);
  const layer1Ref = useRef<HTMLDivElement>(null);
  const animatingRef = useRef(false);
  const currentIndexRef = useRef(0);
  const pendingIndexRef = useRef<number | null>(null);
  const layerIndicesRef = useRef<[number, number]>([0, 0]);
  const visibleLayerRef = useRef<0 | 1>(0);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const transitionIdRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getActiveIndex = () =>
    animatingRef.current && pendingIndexRef.current !== null
      ? pendingIndexRef.current
      : currentIndexRef.current;

  const idx = list.length ? Math.min(currentIndex, list.length - 1) : 0;

  useGsapEntrance(sectionRef, [
    {
      targets: "[data-reveal='slider']",
      y: 18,
      scale: 0.985,
      duration: 1.45,
      delay: 0.35,
      ease: "power1.inOut",
    },
  ]);

  const getLayerRef = (layer: 0 | 1) => (layer === 0 ? layer0Ref : layer1Ref);

  const startKenBurns = useCallback((layer: 0 | 1) => {
    const el = getLayerRef(layer).current;
    const kb = el?.querySelector<HTMLElement>(".slide-kenburns");
    if (!kb || prefersReducedMotion()) return;
    gsap.killTweensOf(kb);
    gsap.set(kb, { scale: 1, x: 0, y: 0 });
    gsap.to(kb, {
      scale: 1.08,
      x: "-1.5%",
      y: "-0.8%",
      duration: INTERVAL_MS / 1000,
      ease: "none",
    });
  }, []);

  const resetKenBurns = useCallback((layer: 0 | 1) => {
    const el = getLayerRef(layer).current;
    const kb = el?.querySelector<HTMLElement>(".slide-kenburns");
    if (!kb) return;
    gsap.killTweensOf(kb);
    gsap.set(kb, { scale: 1, x: 0, y: 0 });
  }, []);

  const normalizeIndex = useCallback(
    (i: number) => {
      if (list.length === 0) return 0;
      if (i < 0) return list.length - 1;
      if (i >= list.length) return 0;
      return i;
    },
    [list.length]
  );

  const applyLayerIndices = useCallback((updated: [number, number]) => {
    layerIndicesRef.current = updated;
    flushSync(() => setLayerIndices(updated));
  }, []);

  const settleVisibleLayer = useCallback(
    (layer: 0 | 1, index: number, restartKenBurns = true) => {
      const hidden = (1 - layer) as 0 | 1;
      const visEl = getLayerRef(layer).current;
      const hidEl = getLayerRef(hidden).current;
      const prevIndex = layerIndicesRef.current[layer];

      if (visEl) {
        gsap.killTweensOf(visEl);
        gsap.set(visEl, { autoAlpha: 1, zIndex: 1 });
      }
      if (hidEl) {
        gsap.killTweensOf(hidEl);
        gsap.set(hidEl, { autoAlpha: 0, zIndex: 0 });
      }

      resetKenBurns(hidden);

      const updated: [number, number] = [...layerIndicesRef.current] as [number, number];
      updated[layer] = index;
      applyLayerIndices(updated);
      visibleLayerRef.current = layer;
      setVisibleLayer(layer);
      currentIndexRef.current = index;
      pendingIndexRef.current = null;
      setCurrentIndex(index);
      animatingRef.current = false;

      if (restartKenBurns && prevIndex !== index) {
        startKenBurns(layer);
      }
    },
    [applyLayerIndices, resetKenBurns, startKenBurns]
  );

  const commitInterruptedTransition = useCallback(() => {
    if (!animatingRef.current) return;

    transitionIdRef.current += 1;
    timelineRef.current?.kill();
    timelineRef.current = null;

    const target = pendingIndexRef.current ?? currentIndexRef.current;
    settleVisibleLayer(visibleLayerRef.current, target, false);
  }, [settleVisibleLayer]);

  const runCrossfade = useCallback(
    (next: number, duration: number) => {
      const outLayer = visibleLayerRef.current;
      const inLayer = (1 - outLayer) as 0 | 1;
      const outEl = getLayerRef(outLayer).current;
      const inEl = getLayerRef(inLayer).current;
      const transitionId = transitionIdRef.current;

      if (!outEl || !inEl) {
        settleVisibleLayer(outLayer, next);
        return;
      }

      gsap.set(inEl, { zIndex: 2, autoAlpha: 0 });
      gsap.set(outEl, { zIndex: 1, autoAlpha: 1 });

      timelineRef.current = gsap
        .timeline({
          onComplete: () => {
            if (transitionId !== transitionIdRef.current) return;
            settleVisibleLayer(inLayer, next);
            timelineRef.current = null;
          },
        })
        .to(outEl, { autoAlpha: 0, duration, ease: "power1.inOut" }, 0)
        .to(inEl, { autoAlpha: 1, duration, ease: "power1.inOut" }, 0);
    },
    [settleVisibleLayer]
  );

  const goTo = useCallback(
    (target: number, duration = CROSSFADE_DURATION) => {
      const next = normalizeIndex(target);
      if (list.length === 0) return;

      const activeIndex = getActiveIndex();
      if (next === activeIndex) return;

      if (prefersReducedMotion()) {
        commitInterruptedTransition();
        settleVisibleLayer(0, next);
        layerIndicesRef.current = [next, next];
        flushSync(() => setLayerIndices([next, next]));
        return;
      }

      commitInterruptedTransition();

      animatingRef.current = true;
      pendingIndexRef.current = next;

      const outLayer = visibleLayerRef.current;
      const inLayer = (1 - outLayer) as 0 | 1;
      const updated: [number, number] = [...layerIndicesRef.current] as [number, number];
      updated[inLayer] = next;
      applyLayerIndices(updated);

      runCrossfade(next, duration);
    },
    [
      list.length,
      normalizeIndex,
      commitInterruptedTransition,
      settleVisibleLayer,
      applyLayerIndices,
      runCrossfade,
    ]
  );

  const resetAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      goTo(currentIndexRef.current + 1);
    }, INTERVAL_MS);
  }, [goTo]);

  useEffect(() => {
    resetAutoplay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resetAutoplay]);

  useEffect(() => {
    currentIndexRef.current = idx;
  }, [idx]);

  useEffect(() => {
    layerIndicesRef.current = layerIndices;
  }, [layerIndices]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    gsap.set(layer0Ref.current, { autoAlpha: 1, zIndex: 1 });
    gsap.set(layer1Ref.current, { autoAlpha: 0, zIndex: 0 });
    startKenBurns(0);
  }, [startKenBurns]);

  const handleGoTo = useCallback(
    (target: number, manual = true) => {
      goTo(target, manual ? MANUAL_CROSSFADE_DURATION : CROSSFADE_DURATION);
      resetAutoplay();
    },
    [goTo, resetAutoplay]
  );

  const handlePrev = useCallback(() => {
    handleGoTo(getActiveIndex() - 1);
  }, [handleGoTo]);

  const handleNext = useCallback(() => {
    handleGoTo(getActiveIndex() + 1);
  }, [handleGoTo]);

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
      if (delta > 0) handleNext();
      else handlePrev();
    },
    [handleNext, handlePrev]
  );

  const slide0 = list[layerIndices[0]] ?? list[0];
  const slide1 = list[layerIndices[1]] ?? list[0];

  return (
    <section ref={sectionRef}>
      <div
        data-reveal="slider"
        className="relative w-full overflow-hidden rounded-2xl bg-[var(--surface)] shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:rounded-3xl"
      >
        <div
          className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[21/9]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            ref={layer0Ref}
            className="absolute inset-0 will-change-[opacity,transform]"
            aria-hidden={visibleLayer !== 0}
          >
            <SlideImages slide={slide0} />
          </div>
          <div
            ref={layer1Ref}
            className="absolute inset-0 will-change-[opacity,transform]"
            aria-hidden={visibleLayer !== 1}
          >
            <SlideImages slide={slide1} />
          </div>
        </div>
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 sm:flex md:left-4 md:h-12 md:w-12"
          aria-label="Предыдущий слайд"
        >
          <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleNext}
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
                  onClick={() => handleGoTo(i)}
                  className={`cursor-pointer rounded-full transition-all duration-500 ${
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
