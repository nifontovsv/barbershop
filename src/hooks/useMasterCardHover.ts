"use client";

import { useEffect, type RefObject } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsapSetup";

export function useMasterCardHover(scopeRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope || prefersReducedMotion()) return;

    const cleanups: Array<() => void> = [];

    scope.querySelectorAll<HTMLElement>("[data-master-card]").forEach((card) => {
      const photo = card.querySelector<HTMLElement>("[data-master-photo]");
      if (!photo) return;

      const onEnter = () => {
        gsap.to(card, { scale: 1.02, boxShadow: "0 16px 32px rgba(0,0,0,0.3)", duration: 0.35, ease: "power2.out" });
        gsap.to(photo, { scale: 1.05, duration: 0.45, ease: "power2.out" });
      };
      const onLeave = () => {
        gsap.to(card, { scale: 1, boxShadow: "0 10px 15px rgba(0,0,0,0.1)", duration: 0.35, ease: "power2.out" });
        gsap.to(photo, { scale: 1, duration: 0.45, ease: "power2.out" });
      };

      card.addEventListener("mouseenter", onEnter);
      card.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        card.removeEventListener("mouseenter", onEnter);
        card.removeEventListener("mouseleave", onLeave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [scopeRef]);
}
