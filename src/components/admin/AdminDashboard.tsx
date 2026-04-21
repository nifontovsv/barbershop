"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BookingCatalogEditor, HeaderSiteEditor, ParallaxBgEditor } from "@/components/admin/ContentBookingEditors";
import { IntField, RatingField } from "@/components/admin/NumericInputs";
import { apiBase, asset } from "@/lib/basePath";
import type {
  AboutContent,
  FooterContent,
  GallerySectionContent,
  MastersSectionContent,
} from "@/lib/sitePublic";
import type { Service, ServiceCategory } from "@/types/booking";
import { ALL_MASTERS_BLOCK_ID } from "@/lib/slotBlockConstants";
import { salonHourOptions } from "@/lib/salonHours";
import type { ClientSmsStatusHint } from "@/lib/notify";

type TabId = "bookings" | "slot_blocks" | "clients" | "content";

const TAB_CONFIG: readonly { id: TabId; label: string }[] = [
  { id: "bookings", label: "Записи" },
  { id: "slot_blocks", label: "Блокировка слотов" },
  { id: "clients", label: "База клиентов" },
  { id: "content", label: "Контент" },
] as const;

function parseAdminTabParam(v: string | null): TabId {
  if (v === "bookings" || v === "slot_blocks" || v === "clients" || v === "content") return v;
  return "bookings";
}

interface ClientRow {
  clientPhone: string;
  displayName: string;
  visitCount: number;
  lastSlotStart: string;
}

interface BookingRow {
  id: string;
  masterId: string;
  masterName: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  slotStart: string;
  status: string;
  comment?: string | null;
  masterComment?: string | null;
}

interface SlotBlockRow {
  id: string;
  masterId: string;
  blockDate: string;
  hour: number;
  note: string | null;
}

interface MasterRow {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  phone: string | null;
  bio: string | null;
  badges: string[];
  sortOrder: number;
  photoPath: string | null;
  visibleOnLanding: number;
}

interface MediaRow {
  id: string;
  kind: string;
  path: string;
  sortOrder: number;
  alt: string | null;
}

const MEDIA_KINDS = [
  { id: "hero_slider", label: "Слайдер на главной" },
  { id: "gallery_design", label: "Галерея: интерьер" },
  { id: "gallery_products", label: "Галерея: товары" },
  { id: "gallery_clients", label: "Галерея: клиенты" },
] as const;

const BOOKING_STATUS_OPTIONS = [
  { value: "pending", label: "Ожидает" },
  { value: "confirmed", label: "Подтверждено" },
  { value: "cancelled", label: "Отменено" },
  { value: "done", label: "Выполнено" },
] as const;

/** Акцентные кнопки «Сохранить» / «Создать» / «Добавить в список» */
const BTN_PRIMARY =
  "cursor-pointer rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-black transition-all duration-200 hover:brightness-110 hover:shadow-md hover:shadow-[var(--accent)]/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 disabled:hover:shadow-none disabled:active:scale-100";

const BTN_PRIMARY_WIDE =
  "cursor-pointer rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-black transition-all duration-200 hover:brightness-110 hover:shadow-md hover:shadow-[var(--accent)]/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const BTN_SECONDARY_ADD =
  "cursor-pointer rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition-all duration-200 hover:border-white/35 hover:bg-white/12 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const FILE_INPUT_ACCENT =
  "mt-1 block w-full text-sm text-white/80 file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-black file:transition-all file:hover:brightness-110 file:active:scale-[0.98]";

const BTN_PRIMARY_BATCH =
  "cursor-pointer rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black transition-all duration-200 hover:brightness-110 hover:shadow-lg hover:shadow-[var(--accent)]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const BTN_DANGER =
  "cursor-pointer rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-100 transition-all duration-200 hover:border-red-400/60 hover:bg-red-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

function bookingStatusSelectClass(status: string): string {
  const base =
    "min-w-[9.5rem] cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors outline-none focus:ring-2 focus:ring-[var(--accent)]/35";
  switch (status) {
    case "pending":
      return `${base} border-amber-500/55 bg-amber-500/20 text-amber-50`;
    case "confirmed":
      return `${base} border-emerald-500/55 bg-emerald-500/20 text-emerald-50`;
    case "cancelled":
      return `${base} border-rose-500/45 bg-rose-950/40 text-rose-100`;
    case "done":
      return `${base} border-sky-500/55 bg-sky-500/20 text-sky-50`;
    default:
      return `${base} border-white/20 bg-zinc-800/80 text-zinc-200`;
  }
}

const MASTER_NOTE_SAVE_MS = 550;

function normalizeBookingNote(s: string | null | undefined) {
  if (s == null) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

/** Заметка мастера: автосохранение при вводе (debounce), высота растёт с текстом */
function MasterCommentCell({
  bookingId,
  saved,
  onSave,
}: {
  bookingId: string;
  saved: string | null | undefined;
  onSave: (id: string, draft: string, previous: string | null | undefined) => Promise<void>;
}) {
  const [draft, setDraft] = useState(saved ?? "");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const growTextarea = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    const minH = 52;
    const next = Math.max(minH, el.scrollHeight);
    const cap = Math.round(typeof window !== "undefined" ? window.innerHeight * 0.5 : 480);
    el.style.height = `${Math.min(next, cap)}px`;
    el.style.overflowY = next > cap ? "auto" : "hidden";
  }, []);

  useLayoutEffect(() => {
    growTextarea();
  }, [draft, growTextarea]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void onSave(bookingId, draft, saved);
    }, MASTER_NOTE_SAVE_MS);
    return () => window.clearTimeout(t);
  }, [draft, bookingId, saved, onSave]);

  return (
    <div className="min-w-[14rem] max-w-[min(22rem,42vw)] py-1">
      <textarea
        ref={taRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        rows={1}
        placeholder="Заметка: пожелания клиента, нюансы работы…"
        className="w-full resize-none rounded-xl border border-white/12 bg-black/35 px-3.5 py-3 text-[0.9375rem] leading-[1.6] tracking-[0.01em] text-white/95 caret-[var(--accent)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] placeholder:text-white/38 focus:border-[var(--accent)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
      />
    </div>
  );
}

function safeParseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mediaPreviewSrc(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return asset(p);
}

async function uploadAdminImage(subdir: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("subdir", subdir);
  const res = await fetch(`${apiBase}/api/admin/upload`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Ошибка загрузки");
  }
  return String(data.path ?? "");
}

function FooterKvEditor({
  raw,
  busy,
  onSave,
}: {
  raw: string | undefined;
  busy: boolean;
  onSave: (data: FooterContent) => void | Promise<void>;
}) {
  const initial = safeParseJson<FooterContent>(raw, {});
  const [brandName, setBrandName] = useState(initial.brandName ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [vkUrl, setVkUrl] = useState(initial.vkUrl ?? "");
  const [url2gis, setUrl2gis] = useState(initial.url2gis ?? "");
  const [urlYandexMaps, setUrlYandexMaps] = useState(initial.urlYandexMaps ?? "");

  useEffect(() => {
    const p = safeParseJson<FooterContent>(raw, {});
    setBrandName(p.brandName ?? "");
    setAddress(p.address ?? "");
    setVkUrl(p.vkUrl ?? "");
    setUrl2gis(p.url2gis ?? "");
    setUrlYandexMaps(p.urlYandexMaps ?? "");
  }, [raw]);

  const persist = () =>
    onSave({
      brandName: brandName || undefined,
      address: address || undefined,
      vkUrl: vkUrl || undefined,
      url2gis: url2gis || undefined,
      urlYandexMaps: urlYandexMaps || undefined,
    });

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-white/90">Подвал (контакты, соцсети)</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void persist()}
          className={BTN_PRIMARY}
        >
          Сохранить
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/65 sm:col-span-2">
          Название бренда
          <input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65 sm:col-span-2">
          Адрес
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65">
          ВКонтакте (URL)
          <input
            value={vkUrl}
            onChange={(e) => setVkUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65">
          2ГИС (URL)
          <input
            value={url2gis}
            onChange={(e) => setUrl2gis(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65 sm:col-span-2">
          Яндекс.Карты (URL)
          <input
            value={urlYandexMaps}
            onChange={(e) => setUrlYandexMaps(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
    </div>
  );
}

function AboutKvEditor({
  raw,
  busy,
  onSave,
}: {
  raw: string | undefined;
  busy: boolean;
  onSave: (data: AboutContent) => void | Promise<void>;
}) {
  const initial = safeParseJson<AboutContent>(raw, {});
  const [title, setTitle] = useState(initial.title ?? "");
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? "");
  const [badgeLines, setBadgeLines] = useState((initial.badges ?? []).join("\n"));
  const [paragraphs, setParagraphs] = useState<string[]>(
    initial.paragraphs?.length ? [...initial.paragraphs] : [""]
  );
  const [tiles, setTiles] = useState<{ label: string; value: string }[]>(
    initial.tiles?.length ? initial.tiles.map((t) => ({ label: t.label, value: t.value })) : []
  );

  useEffect(() => {
    const p = safeParseJson<AboutContent>(raw, {});
    setTitle(p.title ?? "");
    setSubtitle(p.subtitle ?? "");
    setBadgeLines((p.badges ?? []).join("\n"));
    setParagraphs(p.paragraphs?.length ? [...p.paragraphs] : [""]);
    setTiles(p.tiles?.length ? p.tiles.map((t) => ({ label: t.label, value: t.value })) : []);
  }, [raw]);

  const persist = () => {
    const badges = badgeLines
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const paras = paragraphs.map((s) => s.trim()).filter(Boolean);
    const tileRows = tiles
      .map((t) => ({ label: t.label.trim(), value: t.value.trim() }))
      .filter((t) => t.label || t.value);
    onSave({
      title: title || undefined,
      subtitle: subtitle || undefined,
      badges: badges.length ? badges : undefined,
      paragraphs: paras.length ? paras : undefined,
      tiles: tileRows.length ? tileRows : undefined,
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-white/90">Секция «О нас»</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void persist()}
          className={BTN_PRIMARY}
        >
          Сохранить
        </button>
      </div>
      <div className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-white/65">
            Заголовок
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-white/65">
            Подзаголовок
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
        <label className="block text-xs text-white/65">
          Бейджи (один на строку)
          <textarea
            value={badgeLines}
            onChange={(e) => setBadgeLines(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 p-3 text-sm leading-relaxed text-white/90"
          />
        </label>
        <div>
          <span className="text-xs text-white/65">Абзацы текста</span>
          <div className="mt-2 space-y-2">
            {paragraphs.map((p, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  value={p}
                  onChange={(e) => {
                    const next = [...paragraphs];
                    next[i] = e.target.value;
                    setParagraphs(next);
                  }}
                  rows={3}
                  placeholder={`Абзац ${i + 1}`}
                  className="min-h-[72px] flex-1 rounded-xl border border-white/15 bg-black/25 p-3 text-sm text-white/90"
                />
                <button
                  type="button"
                  disabled={busy || paragraphs.length <= 1}
                  onClick={() => setParagraphs(paragraphs.filter((_, j) => j !== i))}
                  className="h-fit shrink-0 cursor-pointer rounded-lg border border-white/15 px-2 py-1 text-xs text-red-300 hover:bg-white/5 disabled:cursor-not-allowed"
                >
                  Удалить
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => setParagraphs([...paragraphs, ""])}
              className="cursor-pointer text-xs text-[var(--accent)] transition-colors duration-200 hover:underline hover:brightness-125 disabled:cursor-not-allowed"
            >
              + Добавить абзац
            </button>
          </div>
        </div>
        <div>
          <span className="text-xs text-white/65">Плитки (подпись и значение)</span>
          <div className="mt-2 space-y-2">
            {tiles.map((t, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <label className="text-xs text-white/55">
                  Подпись
                  <input
                    value={t.label}
                    onChange={(e) => {
                      const next = [...tiles];
                      next[i] = { ...next[i], label: e.target.value };
                      setTiles(next);
                    }}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-white/55">
                  Значение
                  <input
                    value={t.value}
                    onChange={(e) => {
                      const next = [...tiles];
                      next[i] = { ...next[i], value: e.target.value };
                      setTiles(next);
                    }}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setTiles(tiles.filter((_, j) => j !== i))}
                  className="cursor-pointer rounded-lg border border-white/15 px-2 py-1.5 text-xs text-red-300 hover:bg-white/5 disabled:cursor-not-allowed"
                >
                  Удалить
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => setTiles([...tiles, { label: "", value: "" }])}
              className="cursor-pointer text-xs text-[var(--accent)] transition-colors duration-200 hover:underline hover:brightness-125 disabled:cursor-not-allowed"
            >
              + Добавить плитку
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MastersSectionKvEditor({
  raw,
  busy,
  onSave,
}: {
  raw: string | undefined;
  busy: boolean;
  onSave: (data: MastersSectionContent) => void | Promise<void>;
}) {
  const initial = safeParseJson<MastersSectionContent>(raw, {});
  const [title, setTitle] = useState(initial.title ?? "");
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? "");

  useEffect(() => {
    const p = safeParseJson<MastersSectionContent>(raw, {});
    setTitle(p.title ?? "");
    setSubtitle(p.subtitle ?? "");
  }, [raw]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-white/90">Заголовок секции мастеров</span>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void onSave({
              title: title || undefined,
              subtitle: subtitle || undefined,
            })
          }
          className={BTN_PRIMARY}
        >
          Сохранить
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/65">
          Заголовок
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65">
          Подзаголовок
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
    </div>
  );
}

function GalleryKvEditor({
  raw,
  busy,
  onSave,
}: {
  raw: string | undefined;
  busy: boolean;
  onSave: (data: GallerySectionContent) => void | Promise<void>;
}) {
  const initial = safeParseJson<GallerySectionContent>(raw, { tabs: [] });
  const [sectionTitle, setSectionTitle] = useState(initial.sectionTitle ?? "");
  const [sectionSubtitle, setSectionSubtitle] = useState(initial.sectionSubtitle ?? "");
  const [tabs, setTabs] = useState<Array<{ id: string; label: string; subtitle: string }>>(
    initial.tabs?.length
      ? initial.tabs.map((t) => ({ id: t.id, label: t.label, subtitle: t.subtitle }))
      : [
          { id: "design", label: "Интерьер", subtitle: "Атмосфера и детали" },
          { id: "products", label: "Товары", subtitle: "Уход и стайлинг" },
          { id: "clients", label: "Клиенты", subtitle: "Наши работы" },
        ]
  );

  useEffect(() => {
    const p = safeParseJson<GallerySectionContent>(raw, { tabs: [] });
    setSectionTitle(p.sectionTitle ?? "");
    setSectionSubtitle(p.sectionSubtitle ?? "");
    if (p.tabs?.length) {
      setTabs(p.tabs.map((t) => ({ id: t.id, label: t.label, subtitle: t.subtitle })));
    } else {
      setTabs([
        { id: "design", label: "Интерьер", subtitle: "Атмосфера и детали" },
        { id: "products", label: "Товары", subtitle: "Уход и стайлинг" },
        { id: "clients", label: "Клиенты", subtitle: "Наши работы" },
      ]);
    }
  }, [raw]);

  const persist = () => {
    const cleaned = tabs
      .map((t) => ({
        id: t.id.trim(),
        label: t.label.trim(),
        subtitle: t.subtitle.trim(),
      }))
      .filter((t) => t.id);
    onSave({
      sectionTitle: sectionTitle || undefined,
      sectionSubtitle: sectionSubtitle || undefined,
      tabs: cleaned.length ? cleaned : undefined,
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-white/90">Вкладки галереи</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void persist()}
          className={BTN_PRIMARY}
        >
          Сохранить
        </button>
      </div>
      <p className="mt-2 text-xs text-white/45">
        Поле «Код вкладки» должно совпадать с ключами галереи на сайте: обычно{" "}
        <code className="text-[var(--accent)]">design</code>,{" "}
        <code className="text-[var(--accent)]">products</code>,{" "}
        <code className="text-[var(--accent)]">clients</code>.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/65 sm:col-span-2">
          Заголовок секции
          <input
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65 sm:col-span-2">
          Подзаголовок секции
          <input
            value={sectionSubtitle}
            onChange={(e) => setSectionSubtitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
      <div className="mt-6 space-y-4">
        <span className="text-xs font-medium text-white/75">Вкладки</span>
        {tabs.map((t, i) => (
          <div
            key={`${t.id}-${i}`}
            className="rounded-xl border border-white/10 bg-black/20 p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:gap-3 sm:items-end"
          >
            <label className="text-xs text-white/55">
              Код вкладки
              <input
                value={t.id}
                onChange={(e) => {
                  const next = [...tabs];
                  next[i] = { ...next[i], id: e.target.value };
                  setTabs(next);
                }}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 font-mono text-xs text-white"
              />
            </label>
            <label className="text-xs text-white/55">
              Название
              <input
                value={t.label}
                onChange={(e) => {
                  const next = [...tabs];
                  next[i] = { ...next[i], label: e.target.value };
                  setTabs(next);
                }}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-xs text-white/55 sm:col-span-1">
              Подзаголовок
              <input
                value={t.subtitle}
                onChange={(e) => {
                  const next = [...tabs];
                  next[i] = { ...next[i], subtitle: e.target.value };
                  setTabs(next);
                }}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => setTabs(tabs.filter((_, j) => j !== i))}
              className="mt-3 cursor-pointer rounded-lg border border-white/15 px-2 py-1.5 text-xs text-red-300 hover:bg-white/5 disabled:cursor-not-allowed sm:mt-0"
            >
              Удалить
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            setTabs([...tabs, { id: `tab-${Date.now()}`, label: "", subtitle: "" }])
          }
          className="cursor-pointer text-xs text-[var(--accent)] transition-colors duration-200 hover:underline hover:brightness-125 disabled:cursor-not-allowed"
        >
          + Добавить вкладку
        </button>
      </div>
    </div>
  );
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err?.message === "string" ? err.message : res.statusText);
  }
  return res.json() as Promise<T>;
}

export function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = useMemo(() => parseAdminTabParam(searchParams.get("tab")), [searchParams]);
  const setTab = useCallback(
    (id: TabId) => {
      router.replace(`${pathname}?tab=${encodeURIComponent(id)}`, { scroll: false });
    },
    [router, pathname]
  );
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [blocks, setBlocks] = useState<SlotBlockRow[] | null>(null);
  /** Имена мастеров для блокировки слотов */
  const [blockMasterOptions, setBlockMasterOptions] = useState<{ id: string; name: string }[] | null>(
    null
  );
  const [mastersList, setMastersList] = useState<MasterRow[] | null>(null);
  const [siteKv, setSiteKv] = useState<Record<string, string> | null>(null);
  const [mediaByKind, setMediaByKind] = useState<Record<string, MediaRow[]>>({});
  const [bookingCatalog, setBookingCatalog] = useState<{
    categories: ServiceCategory[];
    services: Service[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [showAddMaster, setShowAddMaster] = useState(false);
  const [saveToast, setSaveToast] = useState<{ message: string; key: number } | null>(null);
  /** На сервере включена отправка SMS клиенту при подтверждении / отмене (для диалога подтверждения). */
  const [clientStatusSmsEnabled, setClientStatusSmsEnabled] = useState(false);
  const [bookingFilterMasterId, setBookingFilterMasterId] = useState("");
  const [bookingFilterStatus, setBookingFilterStatus] = useState("");
  const [bookingFilterDateFrom, setBookingFilterDateFrom] = useState("");
  const [bookingFilterDateTo, setBookingFilterDateTo] = useState("");
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockSelectAllRef = useRef<HTMLInputElement>(null);

  const flashSaved = useCallback((message = "Сохранено") => {
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    setSaveToast({ message, key: Date.now() });
    saveToastTimerRef.current = setTimeout(() => {
      setSaveToast(null);
      saveToastTimerRef.current = null;
    }, 2800);
  }, []);

  const blockDate = useBlockForm();
  const hourOptions = useMemo(() => salonHourOptions(), []);

  const masterNameById = useMemo(() => {
    const map = new Map<string, string>();
    blockMasterOptions?.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [blockMasterOptions]);

  function blockMasterLabel(masterId: string): string {
    if (masterId === ALL_MASTERS_BLOCK_ID) return "Все мастера";
    return masterNameById.get(masterId) ?? masterId;
  }

  const loadClients = useCallback(async () => {
    setErr(null);
    const data = await fetchJson<ClientRow[]>(`${apiBase}/api/admin/clients`);
    setClients(data);
  }, []);

  const loadBookingsAndBlocks = useCallback(async () => {
    setErr(null);
    const [b, bl, masters, opts] = await Promise.all([
      fetchJson<BookingRow[]>(`${apiBase}/api/admin/bookings?limit=300`),
      fetchJson<SlotBlockRow[]>(`${apiBase}/api/admin/slot-blocks`),
      fetchJson<MasterRow[]>(`${apiBase}/api/admin/masters`),
      fetchJson<{ clientStatusSms: boolean }>(`${apiBase}/api/admin/notify-options`),
    ]);
    setBookings(b);
    setBlocks(bl);
    setBlockMasterOptions(masters.map((m) => ({ id: m.id, name: m.name })));
    setClientStatusSmsEnabled(opts.clientStatusSms);
  }, []);

  const loadContent = useCallback(async () => {
    setErr(null);
    const [kv, masters, svcCats, svcList] = await Promise.all([
      fetchJson<Record<string, string>>(`${apiBase}/api/admin/site-kv`),
      fetchJson<MasterRow[]>(`${apiBase}/api/admin/masters`),
      fetchJson<ServiceCategory[]>(`${apiBase}/api/admin/service-categories`),
      fetchJson<Service[]>(`${apiBase}/api/admin/services`),
    ]);
    setSiteKv(kv);
    setMastersList(masters);
    setBookingCatalog({ categories: svcCats, services: svcList });
    const media: Record<string, MediaRow[]> = {};
    for (const k of MEDIA_KINDS) {
      media[k.id] = await fetchJson<MediaRow[]>(
        `${apiBase}/api/admin/media?kind=${encodeURIComponent(k.id)}`
      );
    }
    setMediaByKind(media);
  }, []);

  useEffect(() => {
    if (tab === "clients") {
      loadClients().catch((e: Error) => setErr(e.message));
    } else if (tab === "bookings" || tab === "slot_blocks") {
      loadBookingsAndBlocks().catch((e: Error) => setErr(e.message));
    } else {
      loadContent().catch((e: Error) => setErr(e.message));
    }
  }, [tab, loadClients, loadBookingsAndBlocks, loadContent]);

  /** SSE: обновление «Записей» и блокировок при новой записи с сайта или правках в админке (без WebSocket — см. /api/admin/bookings/stream). */
  useEffect(() => {
    if (tab !== "bookings" && tab !== "slot_blocks") return;
    const url = `${apiBase}/api/admin/bookings/stream`;
    const es = new EventSource(url, { withCredentials: true });
    let debounce: ReturnType<typeof setTimeout> | undefined;
    es.onmessage = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        loadBookingsAndBlocks().catch(() => {});
      }, 350);
    };
    return () => {
      if (debounce) clearTimeout(debounce);
      es.close();
    };
  }, [tab, loadBookingsAndBlocks]);

  useEffect(() => {
    if (tab !== "content") setShowAddMaster(false);
  }, [tab]);

  useEffect(() => {
    if (tab !== "slot_blocks") {
      setSelectedBlockIds([]);
      return;
    }
    if (!blocks) return;
    const valid = new Set(blocks.map((b) => b.id));
    setSelectedBlockIds((prev) => prev.filter((id) => valid.has(id)));
  }, [blocks, tab]);

  useEffect(() => {
    const el = blockSelectAllRef.current;
    if (!el) return;
    if (!blocks?.length) {
      el.indeterminate = false;
      return;
    }
    const n = selectedBlockIds.length;
    el.indeterminate = n > 0 && n < blocks.length;
  }, [selectedBlockIds, blocks]);

  const filteredBookings = useMemo(() => {
    if (!bookings) return null;
    return bookings.filter((b) => {
      if (bookingFilterMasterId && b.masterId !== bookingFilterMasterId) return false;
      if (bookingFilterStatus && b.status !== bookingFilterStatus) return false;
      if (bookingFilterDateFrom || bookingFilterDateTo) {
        const ymd = slotStartLocalYmd(b.slotStart);
        if (bookingFilterDateFrom && ymd < bookingFilterDateFrom) return false;
        if (bookingFilterDateTo && ymd > bookingFilterDateTo) return false;
      }
      return true;
    });
  }, [
    bookings,
    bookingFilterMasterId,
    bookingFilterStatus,
    bookingFilterDateFrom,
    bookingFilterDateTo,
  ]);

  const bookingFiltersActive =
    Boolean(bookingFilterMasterId) ||
    Boolean(bookingFilterStatus) ||
    Boolean(bookingFilterDateFrom) ||
    Boolean(bookingFilterDateTo);

  const onStatusChange = async (id: string, status: string) => {
    const prev = bookings?.find((x) => x.id === id);
    if (
      prev &&
      prev.status !== status &&
      (status === "confirmed" || status === "cancelled") &&
      clientStatusSmsEnabled &&
      prev.clientPhone.replace(/\D/g, "")
    ) {
      const action =
        status === "confirmed" ? "подтверждении записи" : "отмене записи";
      const ok = window.confirm(
        `Клиенту на номер ${prev.clientPhone} будет отправлено SMS об ${action}.\n\nПродолжить?`
      );
      if (!ok) return;
    }

    setBusy(true);
    setErr(null);
    try {
      const data = await fetchJson<BookingRow & { clientSms?: ClientSmsStatusHint }>(
        `${apiBase}/api/admin/bookings/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      await loadBookingsAndBlocks();
      if (data.clientSms?.send) {
        flashSaved(
          data.clientSms.kind === "confirmed"
            ? "Клиенту отправлено SMS о подтверждении записи."
            : "Клиенту отправлено SMS об отмене записи."
        );
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const saveMasterComment = useCallback(
    async (id: string, raw: string, previous: string | null | undefined) => {
      const next = normalizeBookingNote(raw);
      const prev = normalizeBookingNote(previous ?? null);
      if (next === prev) return;
      setErr(null);
      try {
        await fetchJson(`${apiBase}/api/admin/bookings/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ masterComment: next }),
        });
        await loadBookingsAndBlocks();
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Ошибка");
      }
    },
    [loadBookingsAndBlocks]
  );

  const addBlock = async () => {
    if (blockDate.selectedHours.length === 0) {
      setErr("Выберите хотя бы один интервал времени");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const data = await fetchJson<{
        created?: unknown[];
        skippedHours?: number[];
        message?: string;
      }>(`${apiBase}/api/admin/slot-blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId: blockDate.masterId,
          blockDate: blockDate.date,
          hours: blockDate.selectedHours,
          note: blockDate.note || undefined,
        }),
      });
      if (data.skippedHours?.length) {
        setErr(
          `Часть слотов уже была заблокирована: ${data.skippedHours.map((h) => `${h}:00–${h + 1}:00`).join(", ")}`
        );
      }
      blockDate.clearNote();
      await loadBookingsAndBlocks();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const removeBlock = async (id: string) => {
    if (!confirm("Удалить блокировку?")) return;
    setBusy(true);
    try {
      await fetch(`${apiBase}/api/admin/slot-blocks/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      setSelectedBlockIds((prev) => prev.filter((x) => x !== id));
      await loadBookingsAndBlocks();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const toggleBlockRowSelected = (id: string) => {
    setSelectedBlockIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllBlocks = () => {
    if (!blocks?.length) return;
    if (selectedBlockIds.length === blocks.length) {
      setSelectedBlockIds([]);
    } else {
      setSelectedBlockIds(blocks.map((b) => b.id));
    }
  };

  const removeSelectedBlocks = async () => {
    if (selectedBlockIds.length === 0) return;
    if (
      !confirm(
        `Удалить ${selectedBlockIds.length} блокировок? Это действие нельзя отменить.`
      )
    ) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/slot-blocks/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedBlockIds }),
      });
      setSelectedBlockIds([]);
      await loadBookingsAndBlocks();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const persistSiteKv = useCallback(
    async (key: string, value: unknown) => {
      setBusy(true);
      setErr(null);
      try {
        await fetchJson(`${apiBase}/api/admin/site-kv`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: JSON.stringify(value) }),
        });
        await loadContent();
        flashSaved();
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Ошибка");
      } finally {
        setBusy(false);
      }
    },
    [loadContent, flashSaved]
  );

  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-semibold text-[var(--text)]">Панель управления</h1>
        <p className="mt-1 text-sm text-white/60">Клиенты, записи, блокировки слотов и контент сайта</p>

        <div
          className="sticky top-14 z-10 -mx-4 mt-6 border-b border-white/10 bg-[var(--bg)]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg)]/85"
        >
          <div className="flex flex-wrap gap-2">
            {TAB_CONFIG.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition ${
                  tab === id
                    ? "bg-[var(--accent)] text-black"
                    : "bg-[var(--surface)] text-white/85 ring-1 ring-white/10 hover:ring-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        {saveToast && (
          <div
            key={saveToast.key}
            role="status"
            className="animate-admin-save-toast mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/45 bg-emerald-950/55 px-4 py-3 text-sm text-emerald-50 shadow-lg shadow-emerald-950/30"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 text-base text-emerald-200 ring-2 ring-emerald-400/30"
              aria-hidden
            >
              ✓
            </span>
            <span className="font-medium">{saveToast.message}</span>
          </div>
        )}

        {tab === "clients" && (
          <section className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-[var(--surface)]/60">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Телефон</th>
                  <th className="px-4 py-3 font-medium">Имя (последнее)</th>
                  <th className="px-4 py-3 font-medium">Визитов</th>
                  <th className="px-4 py-3 font-medium">Последняя запись</th>
                </tr>
              </thead>
              <tbody>
                {!clients ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                      Загрузка…
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                      Пока нет клиентов в базе
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr key={c.clientPhone} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 font-mono text-white/90">{c.clientPhone}</td>
                      <td className="px-4 py-3">{c.displayName}</td>
                      <td className="px-4 py-3">{c.visitCount}</td>
                      <td className="px-4 py-3 text-white/75">{formatSlotLocal(c.lastSlotStart)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        )}

        {tab === "bookings" && (
          <div className="mt-6">
            <section>
              <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-[var(--surface)]/40 px-4 py-3">
                <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-white/55">
                  Мастер
                  <select
                    className="rounded-lg border border-white/15 bg-black/35 px-2 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]/45 focus:ring-2 focus:ring-[var(--accent)]/15"
                    value={bookingFilterMasterId}
                    disabled={!bookings}
                    onChange={(e) => setBookingFilterMasterId(e.target.value)}
                  >
                    <option value="">Все</option>
                    {(blockMasterOptions ?? [])
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name, "ru"))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="flex min-w-[9.5rem] flex-col gap-1 text-xs text-white/55">
                  Статус
                  <select
                    className="rounded-lg border border-white/15 bg-black/35 px-2 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]/45 focus:ring-2 focus:ring-[var(--accent)]/15"
                    value={bookingFilterStatus}
                    disabled={!bookings}
                    onChange={(e) => setBookingFilterStatus(e.target.value)}
                  >
                    <option value="">Все</option>
                    {BOOKING_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-[9.5rem] flex-col gap-1 text-xs text-white/55">
                  Дата с
                  <input
                    type="date"
                    className="rounded-lg border border-white/15 bg-black/35 px-2 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]/45 focus:ring-2 focus:ring-[var(--accent)]/15"
                    value={bookingFilterDateFrom}
                    disabled={!bookings}
                    onChange={(e) => setBookingFilterDateFrom(e.target.value)}
                  />
                </label>
                <label className="flex min-w-[9.5rem] flex-col gap-1 text-xs text-white/55">
                  Дата по
                  <input
                    type="date"
                    className="rounded-lg border border-white/15 bg-black/35 px-2 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]/45 focus:ring-2 focus:ring-[var(--accent)]/15"
                    value={bookingFilterDateTo}
                    disabled={!bookings}
                    onChange={(e) => setBookingFilterDateTo(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={!bookings || !bookingFiltersActive}
                  onClick={() => {
                    setBookingFilterMasterId("");
                    setBookingFilterStatus("");
                    setBookingFilterDateFrom("");
                    setBookingFilterDateTo("");
                  }}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/85 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Сбросить
                </button>
              </div>
              {bookings && (
                <p className="mb-2 text-xs text-white/45">
                  {bookingFiltersActive
                    ? `Показано ${filteredBookings?.length ?? 0} из ${bookings.length} записей`
                    : `Всего записей: ${bookings.length}`}
                </p>
              )}
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[var(--surface)]/60">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-white/60">
                    <tr>
                      <th className="px-3 py-2">Дата и время</th>
                      <th className="px-3 py-2">Клиент</th>
                      <th className="px-3 py-2">Мастер / услуга</th>
                      <th className="px-3 py-2">Комментарий клиента</th>
                      <th className="px-3 py-2">Статус</th>
                      <th className="min-w-[16rem] px-3 py-2">Заметка мастера</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!bookings ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                          Загрузка…
                        </td>
                      </tr>
                    ) : !filteredBookings?.length ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                          {bookingFiltersActive
                            ? "Нет записей по выбранным фильтрам"
                            : "Нет записей"}
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => (
                        <tr key={b.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="align-middle whitespace-nowrap px-3 py-2 text-white/85">
                            {formatSlotLocal(b.slotStart)}
                          </td>
                          <td className="align-middle px-3 py-2">
                            <div>{b.clientName}</div>
                            <div className="font-mono text-xs text-white/55">{b.clientPhone}</div>
                          </td>
                          <td className="align-middle px-3 py-2">
                            <div>{b.masterName}</div>
                            <div className="text-xs text-white/55">{b.serviceName}</div>
                          </td>
                          <td className="align-middle max-w-[200px] px-3 py-2 text-xs text-white/65">
                            {b.comment?.trim() ? b.comment : "—"}
                          </td>
                          <td className="align-middle px-3 py-2">
                            <select
                              className={bookingStatusSelectClass(b.status)}
                              value={b.status}
                              disabled={busy}
                              onChange={(e) => onStatusChange(b.id, e.target.value)}
                            >
                              {BOOKING_STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                              {!BOOKING_STATUS_OPTIONS.some((o) => o.value === b.status) && (
                                <option value={b.status}>{b.status}</option>
                              )}
                            </select>
                          </td>
                          <td className="align-middle min-w-[16rem] max-w-[min(22rem,42vw)] px-2 py-2">
                            <MasterCommentCell
                              key={b.id}
                              bookingId={b.id}
                              saved={b.masterComment}
                              onSave={saveMasterComment}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {tab === "slot_blocks" && (
          <div className="mt-6">
            <section>
              <p className="mb-4 max-w-3xl text-sm text-white/55">
                Заблокированное время недоступно в форме записи. Пункт «Все мастера» — блокировка для
                всех.
              </p>
              <div className="space-y-4 rounded-2xl border border-white/10 bg-[var(--surface)]/40 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-xs text-white/65">
                    Дата
                    <input
                      type="date"
                      value={blockDate.date}
                      onChange={(e) => blockDate.setDate(e.target.value)}
                      className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-white/65">
                    Мастер
                    <select
                      value={blockDate.masterId}
                      onChange={(e) => blockDate.setMasterId(e.target.value)}
                      className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                    >
                      <option value={ALL_MASTERS_BLOCK_ID}>Все мастера</option>
                      {blockMasterOptions?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs text-white/65">
                    Заметка (необязательно)
                    <input
                      type="text"
                      value={blockDate.note}
                      onChange={(e) => blockDate.setNote(e.target.value)}
                      className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={addBlock}
                    className={BTN_PRIMARY_BATCH}
                  >
                    Заблокировать выбранное
                  </button>
                </div>
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-white/65">
                    <span>Время (по часам салона, можно несколько)</span>
                    <button
                      type="button"
                      className="cursor-pointer text-[var(--accent)] underline-offset-2 hover:underline"
                      onClick={blockDate.selectAllHours}
                    >
                      Все
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer text-white/55 underline-offset-2 hover:underline"
                      onClick={blockDate.clearHours}
                    >
                      Снять
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hourOptions.map((h) => (
                      <label
                        key={h}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                          blockDate.selectedHours.includes(h)
                            ? "border-[var(--accent)] bg-[var(--accent)]/15 text-white"
                            : "border-white/15 bg-black/20 text-white/85 hover:border-white/25"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={blockDate.selectedHours.includes(h)}
                          onChange={() => blockDate.toggleHour(h)}
                          className="accent-[var(--accent)]"
                        />
                        {h}:00–{h + 1}:00
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {blocks && blocks.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-sm text-white/70">
                    {selectedBlockIds.length > 0 ? (
                      <>
                        Выбрано: <span className="font-semibold text-[var(--accent)]">{selectedBlockIds.length}</span> из{" "}
                        {blocks.length}
                      </>
                    ) : (
                      <>Отметьте строки или выберите все — затем удалите блокировки одной кнопкой.</>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || selectedBlockIds.length === 0}
                      onClick={removeSelectedBlocks}
                      className="cursor-pointer rounded-lg bg-red-600/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Удалить выбранные
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-[var(--surface)]/60">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-white/60">
                    <tr>
                      <th className="w-10 px-2 py-2">
                        {blocks && blocks.length > 0 ? (
                          <input
                            ref={blockSelectAllRef}
                            type="checkbox"
                            title="Выбрать все"
                            disabled={busy}
                            checked={selectedBlockIds.length > 0 && selectedBlockIds.length === blocks.length}
                            onChange={toggleSelectAllBlocks}
                            className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
                          />
                        ) : null}
                      </th>
                      <th className="px-3 py-2">Дата</th>
                      <th className="px-3 py-2">Час</th>
                      <th className="px-3 py-2">Мастер</th>
                      <th className="px-3 py-2">Заметка</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {!blocks ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-white/50">
                          Загрузка…
                        </td>
                      </tr>
                    ) : blocks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-white/50">
                          Нет блокировок
                        </td>
                      </tr>
                    ) : (
                      blocks.map((s) => {
                        const selected = selectedBlockIds.includes(s.id);
                        return (
                          <tr
                            key={s.id}
                            className={`border-b border-white/5 transition-colors ${
                              selected
                                ? "bg-[var(--accent)]/15 ring-1 ring-inset ring-[var(--accent)]/40"
                                : "hover:bg-white/[0.03]"
                            }`}
                          >
                            <td className="px-2 py-2 align-middle">
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={busy}
                                onChange={() => toggleBlockRowSelected(s.id)}
                                className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
                                aria-label={`Выбрать блокировку ${s.blockDate} ${s.hour}:00`}
                              />
                            </td>
                            <td className="px-3 py-2">{s.blockDate}</td>
                            <td className="px-3 py-2">
                              {s.hour}:00 – {s.hour + 1}:00
                            </td>
                            <td className="px-3 py-2 text-sm text-white/90">
                              {s.masterId === ALL_MASTERS_BLOCK_ID ? "Все мастера" : blockMasterLabel(s.masterId)}
                            </td>
                            <td className="px-3 py-2 text-white/65">{s.note ?? "—"}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => removeBlock(s.id)}
                                className="cursor-pointer text-sm text-red-300 hover:underline disabled:cursor-not-allowed"
                              >
                                Удалить
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {tab === "content" && siteKv && mastersList && bookingCatalog && (
          <div className="mt-6 space-y-10">
            <section>
              <h2 className="text-lg font-semibold">Шапка сайта и услуги для записи</h2>
              <p className="mt-1 text-sm text-white/55">
                Логотип и контакты в шапке. Категории и услуги отображаются в окне «Записаться» на сайте.
              </p>
              <div className="mt-4 space-y-6">
                <ParallaxBgEditor
                  raw={siteKv.parallax_bg}
                  busy={busy}
                  setErr={setErr}
                  onSave={(data) => persistSiteKv("parallax_bg", data)}
                />
                <HeaderSiteEditor
                  raw={siteKv.header}
                  busy={busy}
                  setErr={setErr}
                  onSave={(data) => persistSiteKv("header", data)}
                />
                <BookingCatalogEditor
                  categories={bookingCatalog.categories}
                  services={bookingCatalog.services}
                  busy={busy}
                  onReload={loadContent}
                  setErr={setErr}
                  setBusy={setBusy}
                  flashSaved={flashSaved}
                />
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold">Тексты и контакты</h2>
              <p className="mt-1 text-sm text-white/55">
                Редактируйте поля по разделам. Данные сохраняются в базе как JSON для сайта.
              </p>
              <div className="mt-4 space-y-6">
                <FooterKvEditor
                  raw={siteKv.footer}
                  busy={busy}
                  onSave={(data) => persistSiteKv("footer", data)}
                />
                <AboutKvEditor
                  raw={siteKv.about}
                  busy={busy}
                  onSave={(data) => persistSiteKv("about", data)}
                />
                <MastersSectionKvEditor
                  raw={siteKv.masters_section}
                  busy={busy}
                  onSave={(data) => persistSiteKv("masters_section", data)}
                />
                <GalleryKvEditor
                  raw={siteKv.gallery_section}
                  busy={busy}
                  onSave={(data) => persistSiteKv("gallery_section", data)}
                />
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold">Медиа</h2>
              <p className="mt-1 text-sm text-white/55">
                Загрузите файл или вставьте путь от корня сайта (
                <code className="text-[var(--accent)]">/uploads/...</code>). Ниже — превью и порядок
                отображения.
              </p>
              {MEDIA_KINDS.map((kind) => (
                <MediaKindBlock
                  key={kind.id}
                  label={kind.label}
                  kind={kind.id}
                  items={mediaByKind[kind.id] ?? []}
                  busy={busy}
                  onReload={loadContent}
                  onMutationSuccess={() => flashSaved("Сохранено")}
                  setErr={setErr}
                  setBusy={setBusy}
                />
              ))}
            </section>

            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Мастера на сайте и в записи</h2>
                {!showAddMaster && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowAddMaster(true)}
                    className={BTN_SECONDARY_ADD}
                  >
                    Добавить мастера
                  </button>
                )}
              </div>
              {showAddMaster && (
                <div className="mt-4">
                  <AddMasterForm
                    busy={busy}
                    setErr={setErr}
                    setBusy={setBusy}
                    onCancel={() => setShowAddMaster(false)}
                    notifySaved={flashSaved}
                    onCreated={async () => {
                      await loadContent();
                      setShowAddMaster(false);
                    }}
                  />
                </div>
              )}
              <div className="mt-4 max-h-[min(32rem,60vh)] space-y-6 overflow-y-auto overflow-x-hidden pr-1 scrollbar-theme">
                {mastersList.map((m) => (
                  <MasterEditor
                    key={m.id}
                    master={m}
                    busy={busy}
                    onSaved={loadContent}
                    notifySaved={flashSaved}
                    setErr={setErr}
                    setBusy={setBusy}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "content" && (!siteKv || !mastersList || !bookingCatalog) && (
          <p className="mt-8 text-white/55">Загрузка контента…</p>
        )}
      </div>
    </>
  );
}

function useBlockForm() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [selectedHours, setSelectedHours] = useState<number[]>([12]);
  const [masterId, setMasterId] = useState(ALL_MASTERS_BLOCK_ID);
  const [note, setNote] = useState("");

  const toggleHour = (h: number) => {
    setSelectedHours((prev) => {
      const s = new Set(prev);
      if (s.has(h)) s.delete(h);
      else s.add(h);
      return Array.from(s).sort((a, b) => a - b);
    });
  };

  const selectAllHours = () => setSelectedHours(salonHourOptions());
  const clearHours = () => setSelectedHours([]);

  return {
    date,
    selectedHours,
    masterId,
    note,
    setDate,
    toggleHour,
    selectAllHours,
    clearHours,
    setMasterId,
    setNote,
    clearNote: () => setNote(""),
  };
}

function formatSlotLocal(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/** Календарная дата слота в локальной таймзоне (YYYY-MM-DD) для фильтров. */
function slotStartLocalYmd(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

function MediaKindBlock({
  label,
  kind,
  items,
  busy,
  onReload,
  onMutationSuccess,
  setErr,
  setBusy,
}: {
  label: string;
  kind: string;
  items: MediaRow[];
  busy: boolean;
  onReload: () => Promise<void>;
  onMutationSuccess?: () => void;
  setErr: (s: string | null) => void;
  setBusy: (b: boolean) => void;
}) {
  const [path, setPath] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [alt, setAlt] = useState("");

  const upload = async (file: File) => {
    setBusy(true);
    setErr(null);
    try {
      const subdir =
        kind === "hero_slider"
          ? "hero"
          : kind.startsWith("gallery")
            ? "gallery"
            : "misc";
      const p = await uploadAdminImage(subdir, file);
      setPath(p);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const addRow = async () => {
    if (!path.trim()) {
      setErr("Укажите путь к файлу или загрузите изображение");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, path: path.trim(), sortOrder, alt: alt || undefined }),
      });
      setPath("");
      setAlt("");
      await onReload();
      onMutationSuccess?.();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const patchMedia = async (id: string, patch: Partial<Pick<MediaRow, "path" | "sortOrder" | "alt">>) => {
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/media/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await onReload();
      onMutationSuccess?.();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const deleteMedia = async (id: string) => {
    if (!confirm("Удалить элемент?")) return;
    setBusy(true);
    try {
      await fetch(`${apiBase}/api/admin/media/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      await onReload();
      onMutationSuccess?.();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface)]/40 p-4">
      <h3 className="font-medium text-white/90">{label}</h3>
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <label className="text-xs text-white/60">
          Загрузить файл
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
            className={FILE_INPUT_ACCENT}
          />
        </label>
        {path.trim() ? (
          <div className="flex items-end gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaPreviewSrc(path.trim())}
              alt=""
              className="h-16 w-24 rounded-lg border border-white/15 object-cover"
            />
          </div>
        ) : null}
        <label className="flex flex-col text-xs text-white/65">
          Путь к файлу
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/uploads/..."
            className="mt-1 min-w-[200px] rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 font-mono text-xs text-white"
          />
        </label>
        <label className="flex flex-col text-xs text-white/65">
          Порядок
          <div className="mt-1">
            <IntField
              value={sortOrder}
              onChange={setSortOrder}
              disabled={busy}
              className="w-20 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white"
            />
          </div>
        </label>
        <label className="flex min-w-[160px] flex-1 flex-col text-xs text-white/65">
          Подпись (alt)
          <input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="mt-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={addRow}
          className={BTN_PRIMARY_WIDE}
        >
          Добавить в список
        </button>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-white/45">Пусто</p>
      ) : (
        <div className="mt-4 max-h-[min(26rem,55vh)] overflow-y-auto overflow-x-hidden rounded-xl border border-white/10 bg-black/20 pr-1 scrollbar-theme">
          <ul className="space-y-3 p-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex flex-wrap items-stretch gap-4 rounded-xl border border-white/10 bg-black/25 p-3"
              >
                <div className="flex shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaPreviewSrc(it.path)}
                    alt={it.alt ?? ""}
                    className="h-24 w-32 rounded-lg border border-white/10 object-cover"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 text-xs">
                  <label className="flex flex-wrap items-center gap-2 text-white/65">
                    <span className="shrink-0">Порядок</span>
                    <IntField
                      value={it.sortOrder}
                      onChange={(n) => {
                        if (n !== it.sortOrder) void patchMedia(it.id, { sortOrder: n });
                      }}
                      className="w-20 rounded border border-white/10 bg-black/40 px-2 py-1 text-white"
                      disabled={busy}
                    />
                  </label>
                  <label className="text-white/65">
                    Подпись (alt)
                    <input
                      key={`${it.id}-alt`}
                      defaultValue={it.alt ?? ""}
                      className="mt-1 w-full max-w-md rounded border border-white/10 bg-black/40 px-2 py-1 text-white"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const next = v || null;
                        if (next !== (it.alt ?? null)) void patchMedia(it.id, { alt: next });
                      }}
                    />
                  </label>
                </div>
                <div className="flex flex-col items-end justify-center gap-2">
                  <button
                    type="button"
                    className="cursor-pointer text-sm text-red-300 hover:underline"
                    onClick={() => deleteMedia(it.id)}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AddMasterForm({
  busy,
  onCreated,
  onCancel,
  notifySaved,
  setErr,
  setBusy,
}: {
  busy: boolean;
  onCreated: () => Promise<void>;
  onCancel: () => void;
  notifySaved?: (message?: string) => void;
  setErr: (s: string | null) => void;
  setBusy: (b: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [rating, setRating] = useState(5);
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [badges, setBadges] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [photoPath, setPhotoPath] = useState("");
  const [visible, setVisible] = useState(true);

  const submit = async () => {
    if (!name.trim() || !specialty.trim()) {
      setErr("Укажите имя и специализацию");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/masters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          specialty: specialty.trim(),
          rating,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          badges: badges
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          sortOrder,
          photoPath: photoPath.trim() || null,
          visibleOnLanding: visible,
        }),
      });
      setName("");
      setSpecialty("");
      setRating(5);
      setPhone("");
      setBio("");
      setBadges("");
      setSortOrder(0);
      setPhotoPath("");
      setVisible(true);
      await onCreated();
      notifySaved?.("Мастер добавлен");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--accent)]/35 bg-[var(--surface)]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-white/90">Новый мастер</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/80 transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className={BTN_PRIMARY}
          >
            Создать
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/65">
          Имя
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65">
          Специализация
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65">
          Рейтинг (0–5)
          <div className="mt-1">
            <RatingField
              value={rating}
              onChange={setRating}
              disabled={busy}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </div>
        </label>
        <label className="text-xs text-white/65">
          Телефон (уведомления)
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65 sm:col-span-2">
          Бейджи через запятую
          <input
            value={badges}
            onChange={(e) => setBadges(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="sm:col-span-2">
          <span className="text-xs text-white/65">Фото</span>
          <div className="mt-2 flex flex-wrap items-end gap-4">
            {photoPath.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaPreviewSrc(photoPath.trim())}
                alt=""
                className="h-24 w-24 rounded-xl border border-white/15 object-cover"
              />
            ) : null}
            <label className="text-xs text-white/60">
              Загрузить
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  setErr(null);
                  uploadAdminImage("masters", f)
                    .then((p) => setPhotoPath(p))
                    .catch((err: unknown) =>
                      setErr(err instanceof Error ? err.message : "Ошибка загрузки")
                    )
                    .finally(() => {
                      setBusy(false);
                      e.target.value = "";
                    });
                }}
                className={FILE_INPUT_ACCENT}
              />
            </label>
            <label className="flex min-w-[200px] flex-1 flex-col text-xs text-white/65">
              Путь к фото
              <input
                value={photoPath}
                onChange={(e) => setPhotoPath(e.target.value)}
                placeholder="/uploads/..."
                className="mt-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white"
              />
            </label>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/80 sm:col-span-2">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Показывать в блоке мастеров на сайте
        </label>
        <label className="text-xs text-white/65">
          Порядок сортировки
          <div className="mt-1">
            <IntField
              value={sortOrder}
              onChange={setSortOrder}
              disabled={busy}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </div>
        </label>
      </div>
      <label className="mt-3 block text-xs text-white/65">
        Биография
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 p-3 text-sm leading-relaxed text-white/90"
        />
      </label>
    </div>
  );
}

function MasterEditor({
  master,
  busy,
  onSaved,
  notifySaved,
  setErr,
  setBusy,
}: {
  master: MasterRow;
  busy: boolean;
  onSaved: () => Promise<void>;
  notifySaved?: (message?: string) => void;
  setErr: (s: string | null) => void;
  setBusy: (b: boolean) => void;
}) {
  const [name, setName] = useState(master.name);
  const [specialty, setSpecialty] = useState(master.specialty);
  const [rating, setRating] = useState(master.rating);
  const [phone, setPhone] = useState(master.phone ?? "");
  const [bio, setBio] = useState(master.bio ?? "");
  const [badges, setBadges] = useState(master.badges.join(", "));
  const [sortOrder, setSortOrder] = useState(master.sortOrder);
  const [photoPath, setPhotoPath] = useState(master.photoPath ?? "");
  const [visible, setVisible] = useState(master.visibleOnLanding === 1);

  useEffect(() => {
    setName(master.name);
    setSpecialty(master.specialty);
    setRating(master.rating);
    setPhone(master.phone ?? "");
    setBio(master.bio ?? "");
    setBadges(master.badges.join(", "));
    setSortOrder(master.sortOrder);
    setPhotoPath(master.photoPath ?? "");
    setVisible(master.visibleOnLanding === 1);
  }, [master]);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/masters/${encodeURIComponent(master.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          specialty,
          rating,
          phone: phone || null,
          bio: bio || null,
          badges: badges
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          sortOrder,
          photoPath: photoPath || null,
          visibleOnLanding: visible,
        }),
      });
      await onSaved();
      notifySaved?.("Сохранено");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const removeMaster = async () => {
    if (
      !confirm(
        "Удалить этого мастера? Это действие необратимо. Если у мастера есть записи в журнале (включая прошлые), удаление будет отклонено."
      )
    ) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/masters/${encodeURIComponent(master.id)}`, {
        method: "DELETE",
      });
      await onSaved();
      notifySaved?.("Мастер удалён");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-white/45">id: {master.id}</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void removeMaster()}
            className={BTN_DANGER}
          >
            Удалить мастера
          </button>
          <button type="button" disabled={busy} onClick={() => void save()} className={BTN_PRIMARY}>
            Сохранить мастера
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/65">
          Имя
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65">
          Специализация
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65">
          Рейтинг (0–5)
          <div className="mt-1">
            <RatingField
              value={rating}
              onChange={setRating}
              disabled={busy}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </div>
        </label>
        <label className="text-xs text-white/65">
          Телефон (уведомления)
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65 sm:col-span-2">
          Бейджи через запятую
          <input
            value={badges}
            onChange={(e) => setBadges(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="sm:col-span-2">
          <span className="text-xs text-white/65">Фото</span>
          <div className="mt-2 flex flex-wrap items-end gap-4">
            {photoPath.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaPreviewSrc(photoPath.trim())}
                alt=""
                className="h-28 w-28 rounded-xl border border-white/15 object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-white/20 text-xs text-white/40">
                Нет фото
              </div>
            )}
            <label className="text-xs text-white/60">
              Загрузить
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  setErr(null);
                  uploadAdminImage("masters", f)
                    .then((p) => setPhotoPath(p))
                    .catch((err: unknown) =>
                      setErr(err instanceof Error ? err.message : "Ошибка загрузки")
                    )
                    .finally(() => {
                      setBusy(false);
                      e.target.value = "";
                    });
                }}
                className={FILE_INPUT_ACCENT}
              />
            </label>
            <label className="flex min-w-[200px] flex-1 flex-col text-xs text-white/65">
              Путь к файлу
              <input
                value={photoPath}
                onChange={(e) => setPhotoPath(e.target.value)}
                placeholder="/uploads/..."
                className="mt-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white"
              />
            </label>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/80 sm:col-span-2">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Показывать в блоке мастеров на сайте
        </label>
        <label className="text-xs text-white/65">
          Порядок сортировки
          <div className="mt-1">
            <IntField
              value={sortOrder}
              onChange={setSortOrder}
              disabled={busy}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </div>
        </label>
      </div>
      <label className="mt-3 block text-xs text-white/65">
        Биография
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={5}
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 p-3 text-sm leading-relaxed text-white/90"
        />
      </label>
    </div>
  );
}
