"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/landing/Header";
import { ParallaxBackground } from "@/components/landing/ParallaxBackground";
import { BarbershopSlider } from "@/components/landing/BarbershopSlider";
import { AboutSection } from "@/components/landing/AboutSection";
import { MastersSection } from "@/components/landing/MastersSection";
import { GallerySection } from "@/components/landing/GallerySection";
// import { DownloadCta } from "@/components/landing/DownloadCta";
import { ReviewsSlider } from "@/components/landing/ReviewsSlider";
import { ReviewCtaSection } from "@/components/landing/ReviewCtaSection";
import { Footer } from "@/components/landing/Footer";
import { BookingModal } from "@/components/booking/BookingModal";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showSuccess = useCallback(() => {
    setToast("Запись отправлена");
    setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <div className="relative z-10 min-h-screen">
      <ParallaxBackground />
      {toast && (
        <div
          className="fixed left-1/2 top-24 z-[60] -translate-x-1/2 rounded-xl bg-[var(--accent)] px-6 py-3 text-center font-medium text-black shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
      <Header onBookClick={() => setModalOpen(true)} />
      <main className="pt-16 sm:pt-[72px]">
        <div className="container-landing space-y-8 pb-10 pt-6 md:space-y-10 md:pb-12 md:pt-8 lg:space-y-12 lg:pb-14">
          <BarbershopSlider />
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2 md:gap-10 lg:gap-12">
            <AboutSection />
            <MastersSection />
          </div>
          <GallerySection />
          <ReviewsSlider />
          <ReviewCtaSection />
        </div>
        <Footer />
      </main>
      <BookingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={showSuccess}
      />
    </div>
  );
}
