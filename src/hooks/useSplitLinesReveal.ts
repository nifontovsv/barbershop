"use client";

import { useEffect, type RefObject } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsapSetup";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText);
}

export function useSplitLinesReveal(
  scopeRef: RefObject<HTMLElement | null>,
  selector = "[data-split-lines]",
  deps: unknown[] = []
) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    if (prefersReducedMotion()) {
      scope.querySelectorAll(selector).forEach((el) => {
        gsap.set(el, { visibility: "visible", autoAlpha: 1 });
      });
      return;
    }

    const ctx = gsap.context(() => {
      scope.querySelectorAll(selector).forEach((el) => {
        const split = SplitText.create(el, {
          type: "lines",
          mask: "lines",
          aria: "auto",
          linesClass: "split-line",
        });

        gsap.set(el, { visibility: "visible" });
        gsap.set(split.lines, { y: "100%" });

        gsap.to(split.lines, {
          y: 0,
          duration: 0.65,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            once: true,
          },
        });
      });
    }, scope);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeRef, selector, ...deps]);
}
