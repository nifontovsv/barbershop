"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsapSetup";
import { asset } from "@/lib/basePath";

const DEFAULT_BG = "/images/parallax/parallax-bikes.jpg";

export function ParallaxBackground({ imagePath }: { imagePath?: string }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const src = imagePath?.trim() || DEFAULT_BG;
  const url = asset(src.startsWith("/") ? src : `/${src}`);

  useEffect(() => {
    const layer = layerRef.current;
    const wrap = wrapRef.current;
    if (!layer || !wrap) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.matchMedia({
        "(min-width: 768px)": () => {
          gsap.to(layer, {
            x: 0,
            yPercent: -18,
            ease: "none",
            scrollTrigger: {
              trigger: document.body,
              start: "top top",
              end: "bottom bottom",
              scrub: 1.2,
            },
          });
        },
        "(max-width: 767px)": () => {},
      });
    }, wrap);

    return () => ctx.revert();
  }, [url]);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div
        ref={layerRef}
        className="absolute left-0 top-[4%] bottom-[-6%] w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${url})`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(18,18,18,0.52) 0%, rgba(18,18,18,0.62) 50%, rgba(18,18,18,0.68) 100%)",
        }}
      />
    </div>
  );
}
