"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function DownloadCta() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
      gsap.fromTo(
        buttonsRef.current,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          delay: 0.1,
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="scroll-section px-6 py-16 md:py-24"
    >
      <div className="mx-auto max-w-xl text-center">
        <h2
          ref={titleRef}
          className="text-2xl font-semibold text-[var(--text)] md:text-3xl"
        >
          Удобнее в приложении
        </h2>
        <p className="mt-4 text-[var(--text-muted)]">
          Скачайте приложение Barbershop для быстрой записи и уведомлений.
        </p>
        <div
          ref={buttonsRef}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#"
            className="rounded-xl border border-[var(--surface)] bg-[var(--surface)] px-6 py-3 text-[var(--text)] transition-colors hover:border-[var(--accent)]/50"
          >
            App Store
          </a>
          <a
            href="#"
            className="rounded-xl border border-[var(--surface)] bg-[var(--surface)] px-6 py-3 text-[var(--text)] transition-colors hover:border-[var(--accent)]/50"
          >
            Google Play
          </a>
        </div>
      </div>
    </section>
  );
}
