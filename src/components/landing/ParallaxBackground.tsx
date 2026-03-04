"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { asset } from "@/lib/basePath";

gsap.registerPlugin(ScrollTrigger);

// Фон: Harley и спортивные мотоциклы (сгенерирован)
const BG_IMAGE = "/images/parallax/parallax-bikes.webp";

export function ParallaxBackground() {
  const layerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const wrap = wrapRef.current;
    if (!layer || !wrap) return;

    const ctx = gsap.context(() => {
      gsap.to(layer, {
        yPercent: -25,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2,
        },
      });
    }, wrap);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        ref={layerRef}
        className="absolute -inset-[10%] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${asset(BG_IMAGE)})`,
        }}
      />
      {/* Лёгкий оверлей: мотоциклы видны, общий тон в духе #121212 */}
      <div
        className="absolute inset-0 z-1"
        style={{
          background:
            "linear-gradient(180deg, rgba(18,18,18,0.52) 0%, rgba(18,18,18,0.62) 50%, rgba(18,18,18,0.68) 100%)",
        }}
      />
    </div>
  );
}
