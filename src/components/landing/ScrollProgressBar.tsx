"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsapSetup";

export function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        bar,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: document.documentElement,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.3,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  if (prefersReducedMotion()) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[60] h-[3px] origin-left bg-[var(--accent)]/20"
      aria-hidden
    >
      <div ref={barRef} className="h-full w-full origin-left scale-x-0 bg-[var(--accent)]" />
    </div>
  );
}
