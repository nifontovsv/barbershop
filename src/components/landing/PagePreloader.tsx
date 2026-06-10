"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap, prefersReducedMotion } from "@/lib/gsapSetup";
import { asset } from "@/lib/basePath";

const STORAGE_KEY = "barbershop_preloader_seen";
const MAX_WAIT_MS = 4000;

type PagePreloaderProps = {
  onComplete: () => void;
};

export function PagePreloader({ onComplete }: PagePreloaderProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);
  const [active, setActive] = useState<boolean | null>(null);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    sessionStorage.setItem(STORAGE_KEY, "1");
    document.body.style.overflow = "";
    setActive(false);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const seen = sessionStorage.getItem(STORAGE_KEY);
    if (seen || prefersReducedMotion()) {
      finish();
      return;
    }
    setActive(true);
    document.body.style.overflow = "hidden";
  }, [finish]);

  useEffect(() => {
    if (active !== true) return;

    const fallback = window.setTimeout(finish, MAX_WAIT_MS);
    let ctxRevert: (() => void) | undefined;

    const frame = requestAnimationFrame(() => {
      const overlay = overlayRef.current;
      const logo = logoRef.current;
      const line = lineRef.current;
      if (!overlay || !logo || !line) {
        finish();
        return;
      }

      const ctx = gsap.context(() => {
        gsap
          .timeline({ onComplete: finish })
          .fromTo(logo, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "power2.out" })
          .fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power2.inOut" }, "-=0.2")
          .to(logo, { autoAlpha: 0, y: -12, duration: 0.35, ease: "power2.in" }, "+=0.35")
          .to(overlay, { autoAlpha: 0, duration: 0.4, ease: "power2.inOut" }, "-=0.15");
      });
      ctxRevert = () => ctx.revert();
    });

    return () => {
      window.clearTimeout(fallback);
      cancelAnimationFrame(frame);
      ctxRevert?.();
      document.body.style.overflow = "";
    };
  }, [active, finish]);

  if (active !== true) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg)]"
      aria-hidden
    >
      <div ref={logoRef} className="flex flex-col items-center gap-4">
        <Image
          src={asset("/logo.png")}
          alt=""
          width={72}
          height={72}
          className="h-[72px] w-[72px] object-contain"
          unoptimized
          priority
        />
        <div className="h-[2px] w-32 origin-left overflow-hidden rounded-full bg-[var(--surface)]">
          <div ref={lineRef} className="h-full w-full origin-left scale-x-0 bg-[var(--accent)]" />
        </div>
      </div>
    </div>
  );
}
