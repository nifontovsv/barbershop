"use client";

import { useEffect, type RefObject } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsapSetup";

export type EntranceConfig = {
  targets: string;
  y?: number;
  x?: number;
  duration?: number;
  stagger?: number;
  delay?: number;
  scale?: number;
  ease?: string;
};

export function useGsapEntrance(
  scopeRef: RefObject<HTMLElement | null>,
  configs: EntranceConfig[],
  deps: unknown[] = [],
  onComplete?: () => void
) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    if (prefersReducedMotion()) {
      scope.querySelectorAll("[data-reveal]").forEach((el) => {
        gsap.set(el, { autoAlpha: 1, y: 0, x: 0, scale: 1 });
      });
      onComplete?.();
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });

      for (const cfg of configs) {
        const els = scope.querySelectorAll(cfg.targets);
        if (!els.length) continue;

        tl.fromTo(
          els,
          {
            autoAlpha: 0,
            y: cfg.y ?? 20,
            x: cfg.x ?? 0,
            scale: cfg.scale ?? 1,
          },
          {
            autoAlpha: 1,
            y: 0,
            x: 0,
            scale: 1,
            duration: cfg.duration ?? 0.6,
            stagger: cfg.stagger ?? 0.1,
            delay: cfg.delay ?? 0,
            ease: cfg.ease ?? "power2.out",
          },
          cfg.delay ?? 0
        );
      }
    }, scope);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeRef, onComplete, ...deps]);
}
