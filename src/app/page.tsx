"use client";

import { useState, useCallback } from "react";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { DownloadCta } from "@/components/landing/DownloadCta";
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
    <div className="min-h-screen bg-[var(--bg)]">
      {toast && (
        <div
          className="fixed left-1/2 top-6 z-[60] -translate-x-1/2 rounded-xl bg-[var(--accent)] px-6 py-3 text-center font-medium text-black shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
      <Hero onBookClick={() => setModalOpen(true)} />
      <HowItWorks />
      <DownloadCta />
      <Footer />
      <BookingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={showSuccess}
      />
    </div>
  );
}
