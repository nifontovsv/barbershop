"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsapSetup";

type ScrollRevealSectionProps = {
  children: ReactNode;
  className?: string;
};

const REVEAL_TOP_RATIO = 0.9;

export function ScrollRevealSection({ children, className }: ScrollRevealSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const revealedRef = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el, { autoAlpha: 1, y: 0 });
      return;
    }

    gsap.set(el, { autoAlpha: 0, y: 44 });

    const tryReveal = () => {
      if (revealedRef.current) return;

      const rect = el.getBoundingClientRect();
      const threshold = window.innerHeight * REVEAL_TOP_RATIO;
      if (rect.top >= threshold || rect.bottom <= 0) return;

      revealedRef.current = true;
      gsap.to(el, {
        autoAlpha: 1,
        y: 0,
        duration: 1.1,
        ease: "power2.out",
      });
    };

    window.addEventListener("scroll", tryReveal, { passive: true });
    window.addEventListener("wheel", tryReveal, { passive: true });

    return () => {
      window.removeEventListener("scroll", tryReveal);
      window.removeEventListener("wheel", tryReveal);
    };
  }, []);

  return (
    <div ref={ref} data-section-reveal className={className}>
      {children}
    </div>
  );
}
