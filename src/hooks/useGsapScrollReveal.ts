"use client";

import { useEffect, type RefObject } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsapSetup";

export type RevealConfig = {
  targets: string;
  y?: number;
  x?: number;
  duration?: number;
  stagger?: number;
  delay?: number;
  start?: string;
  clipReveal?: boolean;
};

export function useGsapScrollReveal(
  scopeRef: RefObject<HTMLElement | null>,
  configs: RevealConfig[],
  deps: unknown[] = []
) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    if (prefersReducedMotion()) {
      scope.querySelectorAll("[data-reveal], [data-gallery-item]").forEach((el) => {
        gsap.set(el, { autoAlpha: 1, y: 0, x: 0 });
      });
      return;
    }

    const ctx = gsap.context(() => {
      for (const cfg of configs) {
        const els = scope.querySelectorAll(cfg.targets);
        if (!els.length) continue;

        const fromVars: gsap.TweenVars = {
          autoAlpha: 0,
          y: cfg.y ?? 28,
          x: cfg.x ?? 0,
        };
        if (cfg.clipReveal) {
          fromVars.clipPath = "inset(100% 0% 0% 0%)";
        }

        gsap.fromTo(els, fromVars, {
          autoAlpha: 1,
          y: 0,
          x: 0,
          clipPath: cfg.clipReveal ? "inset(0% 0% 0% 0%)" : undefined,
          duration: cfg.duration ?? 0.65,
          stagger: cfg.stagger ?? 0.12,
          delay: cfg.delay ?? 0,
          ease: "power2.out",
          scrollTrigger: {
            trigger: scope,
            start: cfg.start ?? "top 82%",
            once: true,
          },
        });
      }
    }, scope);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeRef, ...deps]);
}
