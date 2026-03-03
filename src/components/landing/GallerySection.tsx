"use client";

import Image from "next/image";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CLIENT_IMAGES = [1, 2, 3, 4, 5, 6, 7, 9];
const PRODUCT_IMAGES = [1, 2];

export function GallerySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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
          scrollTrigger: { trigger: section, start: "top 85%" },
        }
      );
      gsap.fromTo(
        gridRef.current?.children ?? [],
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.05,
          scrollTrigger: { trigger: section, start: "top 80%" },
        }
      );
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="scroll-section">
      <div className="mx-auto max-w-5xl rounded-2xl bg-[var(--bg)]/90 px-6 py-10 shadow-xl backdrop-blur-sm sm:px-8 sm:py-12">
        <h2
          ref={titleRef}
          className="text-center text-2xl font-semibold text-[var(--text)] md:text-3xl"
        >
          Наши работы и товары
        </h2>
        <div
          ref={gridRef}
          className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4"
        >
        {CLIENT_IMAGES.map((n) => (
          <div
            key={`client-${n}`}
            className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface)]"
          >
            <Image
              src={`/images/clients/${n}.webp`}
              alt={`Работа мастеров ${n}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </div>
        ))}
        {PRODUCT_IMAGES.map((n) => (
          <div
            key={`product-${n}`}
            className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface)]"
          >
            <Image
              src={`/images/products/${n}.webp`}
              alt={`Товар ${n}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}
