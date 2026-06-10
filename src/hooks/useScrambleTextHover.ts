"use client";

import { useEffect, type RefObject } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsapSetup";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrambleTextPlugin);
}

export function useScrambleTextHover(
  buttonRef: RefObject<HTMLButtonElement | null>,
  text = "Записаться"
) {
  useEffect(() => {
    const btn = buttonRef.current;
    if (!btn || prefersReducedMotion()) return;

    const onEnter = () => {
      gsap.to(btn, {
        duration: 0.6,
        scrambleText: {
          text,
          chars: "upperCase",
          speed: 0.35,
          tweenLength: false,
        },
      });
    };

    btn.addEventListener("mouseenter", onEnter);
    return () => btn.removeEventListener("mouseenter", onEnter);
  }, [buttonRef, text]);
}
