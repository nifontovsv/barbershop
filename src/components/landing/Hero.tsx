"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

interface HeroProps {
  onBookClick: () => void;
}

export function Hero({ onBookClick }: HeroProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
      gsap.fromTo(
        subtitleRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.15, ease: "power2.out" }
      );
      gsap.fromTo(
        ctaRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.3, ease: "power2.out" }
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-6 py-20 text-center">
      <h1
        ref={titleRef}
        className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl md:text-6xl"
      >
        Barbershop
      </h1>
      <p
        ref={subtitleRef}
        className="mt-4 max-w-md text-lg text-[var(--text-muted)] sm:text-xl"
      >
        Запишись к мастеру за минуту
      </p>
      <button
        ref={ctaRef}
        type="button"
        onClick={onBookClick}
        className="mt-10 rounded-xl bg-[var(--accent)] px-8 py-4 text-lg font-semibold text-black transition-opacity hover:opacity-90"
      >
        Записаться
      </button>
    </section>
  );
}
