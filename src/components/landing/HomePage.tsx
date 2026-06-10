"use client";

import { useState, useCallback, useEffect } from "react";
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
import { AdminToast, type AdminToastPayload } from "@/components/admin/AdminToast";
import { ScrollProgressBar } from "@/components/landing/ScrollProgressBar";
import { PagePreloader } from "@/components/landing/PagePreloader";
import { ScrollRevealSection } from "@/components/landing/ScrollRevealSection";
import { ScrollTrigger } from "@/lib/gsapSetup";
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
  const [toast, setToast] = useState<AdminToastPayload | null>(null);
  const [pageReady, setPageReady] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      !!sessionStorage.getItem("barbershop_preloader_seen") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  });

  const showSuccess = useCallback(() => {
    setToast({ message: "Запись отправлена", type: "success", key: Date.now() });
    setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    if (!pageReady) return;
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => window.clearTimeout(t);
  }, [pageReady]);

  return (
    <>
      <PagePreloader onComplete={() => setPageReady(true)} />
      {pageReady && (
        <div className="relative z-10 min-h-screen">
          <ScrollProgressBar />
          <ParallaxBackground imagePath={parallaxBg.imagePath} />
          <AdminToast toast={toast} />
          <Header
            onBookClick={() => setModalOpen(true)}
            logoPath={header.logoPath}
            title={header.title}
            phoneTel={header.phoneTel}
            phoneDisplay={header.phoneDisplay}
          />
          <main className="pt-16 sm:pt-[72px]">
            <div className="container-landing space-y-8 pb-10 pt-6 md:space-y-10 md:pb-12 md:pt-8 lg:space-y-12 lg:pb-14">
              <div id="hero">
                <BarbershopSlider slides={heroSlides} />
              </div>
              <ScrollRevealSection>
                <AboutSection
                  title={about.title}
                  subtitle={about.subtitle}
                  badges={about.badges}
                  paragraphs={about.paragraphs}
                  tiles={about.tiles}
                />
              </ScrollRevealSection>
              <ScrollRevealSection>
                <MastersSection
                  title={mastersSection.title}
                  subtitle={mastersSection.subtitle}
                  masters={masters}
                />
              </ScrollRevealSection>
              <ScrollRevealSection>
                <GallerySection
                  sectionTitle={gallerySection.sectionTitle}
                  sectionSubtitle={gallerySection.sectionSubtitle}
                  tabs={galleryTabs.length ? galleryTabs : undefined}
                  itemsByTab={galleryItems}
                />
              </ScrollRevealSection>
              <ScrollRevealSection>
                <ReviewsSlider />
              </ScrollRevealSection>
              <ScrollRevealSection>
                <ReviewCtaSection />
              </ScrollRevealSection>
              <ScrollRevealSection>
                <MapSection />
              </ScrollRevealSection>
            </div>
            <ScrollRevealSection>
              <Footer
                brandName={footer.brandName}
                address={footer.address}
                vkUrl={footer.vkUrl}
                url2gis={footer.url2gis}
                urlYandexMaps={footer.urlYandexMaps}
              />
            </ScrollRevealSection>
          </main>
          <BookingModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSuccess={showSuccess}
          />
        </div>
      )}
    </>
  );
}
