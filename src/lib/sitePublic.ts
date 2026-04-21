import {
  getAllSiteKv,
  listMediaByKind,
  listMastersForLanding,
  type MediaItemRow,
  type MasterLandingRow,
} from "@/lib/db";

export type FooterContent = {
  brandName?: string;
  address?: string;
  vkUrl?: string;
  url2gis?: string;
  urlYandexMaps?: string;
};

export type AboutContent = {
  title?: string;
  subtitle?: string;
  badges?: string[];
  paragraphs?: string[];
  tiles?: { label: string; value: string }[];
};

export type MastersSectionContent = {
  title?: string;
  subtitle?: string;
};

export type GallerySectionContent = {
  sectionTitle?: string;
  sectionSubtitle?: string;
  tabs?: { id: string; label: string; subtitle: string }[];
};

export type ParallaxBgContent = {
  /** Путь к фоновому изображению (параллакс), напр. /images/parallax/... или /uploads/... */
  imagePath?: string;
};

export type HeaderContent = {
  /** Путь к логотипу от корня сайта, напр. /logo.png или /uploads/... */
  logoPath?: string;
  /** Название рядом с логотипом */
  title?: string;
  /** Номер для ссылки tel: (только цифры и +) */
  phoneTel?: string;
  /** Как показать номер посетителю */
  phoneDisplay?: string;
};

function safeParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export interface PublicSitePayload {
  kv: {
    parallax_bg: ParallaxBgContent;
    header: HeaderContent;
    footer: FooterContent;
    about: AboutContent;
    masters_section: MastersSectionContent;
    gallery_section: GallerySectionContent;
  };
  hero: MediaItemRow[];
  gallery_design: MediaItemRow[];
  gallery_products: MediaItemRow[];
  gallery_clients: MediaItemRow[];
  masters: MasterLandingRow[];
}

export function getPublicSitePayload(): PublicSitePayload {
  const all = getAllSiteKv();
  return {
    kv: {
      parallax_bg: safeParse(all.parallax_bg, {}),
      header: safeParse(all.header, {}),
      footer: safeParse(all.footer, {}),
      about: safeParse(all.about, {}),
      masters_section: safeParse(all.masters_section, {}),
      gallery_section: safeParse(all.gallery_section, { tabs: [] }),
    },
    hero: listMediaByKind("hero_slider"),
    gallery_design: listMediaByKind("gallery_design"),
    gallery_products: listMediaByKind("gallery_products"),
    gallery_clients: listMediaByKind("gallery_clients"),
    masters: listMastersForLanding(),
  };
}
