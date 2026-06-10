"use client";

import { useEffect, type RefObject } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsapSetup";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText);
}

export function useSplitTextReveal(
  scopeRef: RefObject<HTMLElement | null>,
  selector = "[data-split-text]",
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
          type: "words",
          aria: "auto",
          wordsClass: "split-word",
        });

        gsap.set(el, { visibility: "visible" });
        gsap.set(split.words, { autoAlpha: 0, y: 18 });

        gsap.to(split.words, {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            once: true,
          },
        });
      });
    }, scope);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeRef, selector, ...deps]);
}
