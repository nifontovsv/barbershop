"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/landing/Header";
import { ParallaxBackground } from "@/components/landing/ParallaxBackground";
import { BarbershopSlider, type HeroSlide } from "@/components/landing/BarbershopSlider";
import { AboutSection } from "@/components/landing/AboutSection";
import { MastersSection, type LandingMaster } from "@/components/landing/MastersSection";
import { GallerySection, type GalleryItem, type GalleryTab } from "@/components/landing/GallerySection";
import { ReviewsSlider } from "@/components/landing/ReviewsSlider";
import { ReviewCtaSection } from "@/components/landing/ReviewCtaSection";
import { MapSection } from "@/components/landing/MapSection";
import { Footer } from "@/components/landing/Footer";
import { BookingModal } from "@/components/booking/BookingModal";
import type {
  AboutContent,
  FooterContent,
  GallerySectionContent,
  HeaderContent,
  MastersSectionContent,
  ParallaxBgContent,
} from "@/lib/sitePublic";

export type HomePageProps = {
  heroSlides: HeroSlide[];
  parallaxBg: ParallaxBgContent;
  header: HeaderContent;
  about: AboutContent;
  footer: FooterContent;
  mastersSection: MastersSectionContent;
  gallerySection: GallerySectionContent;
  galleryTabs: Array<{ id: GalleryTab; label: string; subtitle: string }>;
  galleryItems: Record<GalleryTab, GalleryItem[]>;
  masters: LandingMaster[];
};

export function HomePage({
  heroSlides,
  parallaxBg,
  header,
  about,
  footer,
  mastersSection,
  gallerySection,
  galleryTabs,
  galleryItems,
  masters,
}: HomePageProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showSuccess = useCallback(() => {
    setToast("Запись отправлена");
    setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <div className="relative z-10 min-h-screen">
      <ParallaxBackground imagePath={parallaxBg.imagePath} />
      {toast && (
        <div
          className="fixed left-1/2 top-24 z-[60] -translate-x-1/2 rounded-xl bg-[var(--accent)] px-6 py-3 text-center font-medium text-black shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
      <Header
        onBookClick={() => setModalOpen(true)}
        logoPath={header.logoPath}
        title={header.title}
        phoneTel={header.phoneTel}
        phoneDisplay={header.phoneDisplay}
      />
      <main className="pt-16 sm:pt-[72px]">
        <div className="container-landing space-y-8 pb-10 pt-6 md:space-y-10 md:pb-12 md:pt-8 lg:space-y-12 lg:pb-14">
          <BarbershopSlider slides={heroSlides} />
          <AboutSection
            title={about.title}
            subtitle={about.subtitle}
            badges={about.badges}
            paragraphs={about.paragraphs}
            tiles={about.tiles}
          />
          <MastersSection
            title={mastersSection.title}
            subtitle={mastersSection.subtitle}
            masters={masters}
          />
          <GallerySection
            sectionTitle={gallerySection.sectionTitle}
            sectionSubtitle={gallerySection.sectionSubtitle}
            tabs={galleryTabs.length ? galleryTabs : undefined}
            itemsByTab={galleryItems}
          />
          <ReviewsSlider />
          <ReviewCtaSection />
          <MapSection />
        </div>
        <Footer
          brandName={footer.brandName}
          address={footer.address}
          vkUrl={footer.vkUrl}
          url2gis={footer.url2gis}
          urlYandexMaps={footer.urlYandexMaps}
        />
      </main>
      <BookingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={showSuccess}
      />
    </div>
  );
}
