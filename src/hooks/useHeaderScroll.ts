"use client";

import { useEffect, type RefObject } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsapSetup";

export function useHeaderScroll(headerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        start: 0,
        end: 120,
        scrub: 0.5,
        onUpdate: (self) => {
          const p = self.progress;
          gsap.set(header, {
            "--header-blur": `${8 + p * 8}px`,
            "--header-bg-opacity": 0.95 + p * 0.04,
          });
        },
      });

      ScrollTrigger.create({
        start: "top -60",
        end: 99999,
        toggleClass: { targets: header, className: "header--scrolled" },
      });
    }, header);

    return () => ctx.revert();
  }, [headerRef]);
}
