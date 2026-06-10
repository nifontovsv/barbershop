import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function scrollToSection(selector: string, offsetY = 88) {
  if (typeof window === "undefined") return;
  const target = document.querySelector(selector);
  if (!target) return;

  if (prefersReducedMotion()) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  gsap.to(window, {
    duration: 0.9,
    ease: "power2.inOut",
    scrollTo: { y: selector, offsetY },
  });
}

export { gsap, ScrollTrigger, ScrollToPlugin };
