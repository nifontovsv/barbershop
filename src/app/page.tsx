import { getPublicSitePayload } from "@/lib/sitePublic";
import { HomePage } from "@/components/landing/HomePage";
import { asset } from "@/lib/basePath";
import type { GalleryTab } from "@/components/landing/GallerySection";
import type { LandingMaster } from "@/components/landing/MastersSection";

export const dynamic = "force-dynamic";

function mediaPath(p: string) {
  return p.startsWith("/") ? p : `/${p}`;
}

export default function Home() {
  const site = getPublicSitePayload();
  const heroSlides = site.hero.map((h, i) => ({
    src: asset(mediaPath(h.path)),
    alt: h.alt?.trim() || `Парикмахерская — фото ${i + 1}`,
  }));

  const gv = site.kv.gallery_section;
  const rawTabs = gv.tabs ?? [];
  const galleryTabs: Array<{ id: GalleryTab; label: string; subtitle: string }> = [];
  for (const t of rawTabs) {
    if (t.id === "design" || t.id === "products" || t.id === "clients") {
      galleryTabs.push({
        id: t.id,
        label: typeof t.label === "string" ? t.label : t.id,
        subtitle: typeof t.subtitle === "string" ? t.subtitle : "",
      });
    }
  }

  const mapKind = (rows: typeof site.gallery_design) =>
    rows.map((m) => ({
      key: m.id,
      src: asset(mediaPath(m.path)),
      alt: m.alt?.trim() || "",
    }));

  const galleryItems: Record<GalleryTab, ReturnType<typeof mapKind>> = {
    design: mapKind(site.gallery_design),
    products: mapKind(site.gallery_products),
    clients: mapKind(site.gallery_clients),
  };

  const masters: LandingMaster[] = site.masters.map((m) => ({
    id: m.id,
    name: m.name,
    specialty: m.specialty,
    rating: m.rating,
    badges: m.badges,
    description: m.bio ?? "",
    photoPath: m.photoPath,
  }));

  return (
    <HomePage
      heroSlides={heroSlides}
      parallaxBg={site.kv.parallax_bg}
      header={site.kv.header}
      about={site.kv.about}
      footer={site.kv.footer}
      mastersSection={site.kv.masters_section}
      gallerySection={gv}
      galleryTabs={galleryTabs}
      galleryItems={galleryItems}
      masters={masters}
    />
  );
}
