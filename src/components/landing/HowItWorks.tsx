"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  { num: 1, title: "Выбери мастера", desc: "Посмотри профили и рейтинг" },
  { num: 2, title: "Выбери время", desc: "Удобный слот на любой день" },
  { num: 3, title: "Готово", desc: "Мастер получит уведомление" },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        itemsRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
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
      <h2 className="text-center text-2xl font-semibold text-[var(--text)] md:text-3xl">
        Как это работает
      </h2>
      <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div
            key={step.num}
            ref={(el) => {
              if (el) itemsRef.current[i] = el;
            }}
            className="rounded-2xl border border-[var(--surface)] bg-[var(--surface)] p-6 text-center"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-bold text-black">
              {step.num}
            </span>
            <h3 className="mt-4 font-semibold text-[var(--text)]">{step.title}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
