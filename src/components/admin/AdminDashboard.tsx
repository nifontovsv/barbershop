"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminSidebar, type AdminTabId } from "@/components/admin/AdminSidebar";
import { AdminEmployeesPanel, type EmployeeListItem } from "@/components/admin/AdminEmployeesPanel";
import { AdminMasterSchedulePanel } from "@/components/admin/AdminMasterSchedulePanel";
import { ScheduleDayView, type ScheduleDayShift } from "@/components/admin/ScheduleDayView";
import type { BreakJournalSavePayload } from "@/components/admin/BreakJournalModal";
import type { BookingJournalSavePayload } from "@/components/admin/BookingJournalModal";
import { slotStartLocalYmd, todayYmd } from "@/lib/scheduleLayout";
import { BookingCatalogEditor, HeaderSiteEditor, ParallaxBgEditor } from "@/components/admin/ContentBookingEditors";
import { SalonHoursEditor } from "@/components/admin/SalonHoursEditor";
import { SlotBlockEditModal } from "@/components/admin/SlotBlockEditModal";
import { AdminClientsPanel } from "@/components/admin/AdminClientsPanel";
import { AdminToast, type AdminToastPayload } from "@/components/admin/AdminToast";
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
import { defaultSalonHours, salonHourOptionsFrom, type SalonHoursConfig } from "@/lib/salonHours";
import type { ClientSmsStatusHint } from "@/lib/notify";
import {
  canAccessTab,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  type AdminPermissionTab,
  type EmployeePermissions,
} from "@/lib/adminPermissions";

type TabId = "bookings" | "slot_blocks" | "clients" | "content" | "employees" | "shifts";

interface AdminSessionInfo {
  login: string;
  isEnvAdmin: boolean;
  masterId: string | null;
  employeeId: string | null;
  permissions: EmployeePermissions;
}

const TAB_PERMISSION: Record<TabId, AdminPermissionTab | "employees"> = {
  bookings: "bookings",
  slot_blocks: "slot_blocks",
  shifts: "shifts",
  clients: "clients",
  content: "content",
  employees: "employees",
};

function firstAllowedTab(permissions: EmployeePermissions): TabId {
  const order: TabId[] = ["bookings", "slot_blocks", "shifts", "clients", "content"];
  for (const id of order) {
    if (canAccessTab(permissions, TAB_PERMISSION[id] as AdminPermissionTab)) return id;
  }
  return "bookings";
}

function parseAdminTabParam(v: string | null): TabId {
  if (
    v === "bookings" ||
    v === "slot_blocks" ||
    v === "clients" ||
    v === "content" ||
    v === "employees" ||
    v === "shifts"
  ) {
    return v;
  }
  return "bookings";
}

interface BookingRow {
  id: string;
  masterId: string;
  masterName: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  slotStart: string;
  slotEnd: string;
  status: string;
  comment?: string | null;
  masterComment?: string | null;
  createdAt?: string;
}

interface MasterBreakRow {
  id: string;
  masterId: string;
  masterName: string;
  slotStart: string;
  slotEnd: string;
  durationMinutes: number;
  comment?: string | null;
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

function MasterPhotoThumbnail({
  photoPath,
  busy,
  onClear,
  size,
}: {
  photoPath: string;
  busy: boolean;
  onClear: () => void;
  size: "sm" | "lg";
}) {
  const trimmed = photoPath.trim();
  if (!trimmed) return null;
  const dim = size === "lg" ? "h-28 w-28" : "h-24 w-24";
  return (
    <div className={`relative shrink-0 ${dim}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaPreviewSrc(trimmed)}
        alt=""
        className={`${dim} rounded-xl border border-white/15 object-cover`}
      />
      <button
        type="button"
        disabled={busy}
        onClick={onClear}
        title="Убрать фото"
        aria-label="Убрать фото"
        className="absolute right-1 top-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-[15px] font-semibold leading-none text-white shadow-md ring-1 ring-white/30 transition hover:bg-red-950/95 hover:text-red-50 hover:ring-red-400/45 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ×
      </button>
    </div>
  );
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

  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [masterBreaks, setMasterBreaks] = useState<MasterBreakRow[] | null>(null);
  const [journalServices, setJournalServices] = useState<Service[]>([]);
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
  const [editingBlock, setEditingBlock] = useState<SlotBlockRow | null>(null);
  const [showAddMaster, setShowAddMaster] = useState(false);
  const [toast, setToast] = useState<AdminToastPayload | null>(null);
  /** На сервере включена отправка SMS клиенту при подтверждении / отмене (для диалога подтверждения). */
  const [clientStatusSmsEnabled, setClientStatusSmsEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(todayYmd);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [employees, setEmployees] = useState<EmployeeListItem[] | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedShiftMasterId, setSelectedShiftMasterId] = useState<string | null>(null);
  const [sidebarMasters, setSidebarMasters] = useState<{ id: string; name: string }[]>([]);
  const [salonHours, setSalonHours] = useState<SalonHoursConfig>(defaultSalonHours);
  const [dayShifts, setDayShifts] = useState<ScheduleDayShift[] | null>(null);
  const [sessionInfo, setSessionInfo] = useState<AdminSessionInfo | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockSelectAllRef = useRef<HTMLInputElement>(null);
  const tabRef = useRef(tab);
  const scheduleDateRef = useRef(scheduleDate);
  tabRef.current = tab;
  scheduleDateRef.current = scheduleDate;

  const isEnvAdmin = sessionInfo?.isEnvAdmin ?? false;
  const permissions = sessionInfo?.permissions ?? DEFAULT_EMPLOYEE_PERMISSIONS;
  const ownMasterId =
    !isEnvAdmin && permissions.bookingsOwnOnly ? sessionInfo?.masterId ?? null : null;
  const slotBlocksLocked =
    !isEnvAdmin && permissions.slotBlocksOwnOnly ? sessionInfo?.masterId ?? null : null;
  const shiftsLocked =
    !isEnvAdmin && permissions.shiftsOwnOnly ? sessionInfo?.masterId ?? null : null;
  const hideOthersPhones = !isEnvAdmin && permissions.hideOthersPhones;

  const showToast = useCallback((message: string, type: AdminToastPayload["type"] = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type, key: Date.now() });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 5000);
  }, []);

  const flashSaved = useCallback((message = "Сохранено") => showToast(message, "success"), [showToast]);

  useEffect(() => {
    if (!err) return;
    showToast(err, "error");
    const clearErr = setTimeout(() => setErr(null), 5000);
    return () => clearTimeout(clearErr);
  }, [err, showToast]);

  const blockDate = useBlockForm(salonHours, slotBlocksLocked);
  const hourOptions = useMemo(() => salonHourOptionsFrom(salonHours), [salonHours]);

  const visibleBlocks = useMemo(() => {
    if (!blocks) return null;
    if (isEnvAdmin || !slotBlocksLocked) return blocks;
    return blocks.filter((b) => b.masterId === slotBlocksLocked);
  }, [blocks, isEnvAdmin, slotBlocksLocked]);

  const canEditBlock = useCallback(
    (b: SlotBlockRow) =>
      isEnvAdmin ||
      (!!slotBlocksLocked && b.masterId === slotBlocksLocked && b.masterId !== ALL_MASTERS_BLOCK_ID),
    [isEnvAdmin, slotBlocksLocked]
  );

  const loadSalonHours = useCallback(async () => {
    const data = await fetchJson<SalonHoursConfig>(`${apiBase}/api/admin/salon-hours`);
    setSalonHours(data);
  }, []);

  const loadDayShifts = useCallback(async (date: string) => {
    const data = await fetchJson<ScheduleDayShift[]>(
      `${apiBase}/api/admin/shifts/day?date=${encodeURIComponent(date)}`
    );
    setDayShifts(data);
  }, []);

  const masterNameById = useMemo(() => {
    const map = new Map<string, string>();
    blockMasterOptions?.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [blockMasterOptions]);

  function blockMasterLabel(masterId: string): string {
    if (masterId === ALL_MASTERS_BLOCK_ID) return "Все мастера";
    return masterNameById.get(masterId) ?? masterId;
  }

  const loadEmployees = useCallback(async () => {
    setErr(null);
    const [list, masters] = await Promise.all([
      fetchJson<EmployeeListItem[]>(`${apiBase}/api/admin/employees`),
      fetchJson<MasterRow[]>(`${apiBase}/api/admin/masters`),
    ]);
    setEmployees(list);
    setSidebarMasters(masters.map((m) => ({ id: m.id, name: m.name })));
  }, []);

  const loadSidebarMasters = useCallback(async () => {
    const masters = await fetchJson<MasterRow[]>(`${apiBase}/api/admin/masters`);
    setSidebarMasters(masters.map((m) => ({ id: m.id, name: m.name })));
  }, []);

  const loadBookingsAndBlocks = useCallback(async () => {
    setErr(null);
    const [b, bl, brk, masters, opts, svcList] = await Promise.all([
      fetchJson<BookingRow[]>(`${apiBase}/api/admin/bookings?limit=300`),
      fetchJson<SlotBlockRow[]>(`${apiBase}/api/admin/slot-blocks`),
      fetchJson<MasterBreakRow[]>(`${apiBase}/api/admin/master-breaks?limit=300`),
      fetchJson<MasterRow[]>(`${apiBase}/api/admin/masters`),
      fetchJson<{ clientStatusSms: boolean }>(`${apiBase}/api/admin/notify-options`),
      fetchJson<Service[]>(`${apiBase}/api/admin/services`),
    ]);
    setBookings(b);
    setBlocks(bl);
    setMasterBreaks(brk);
    setBlockMasterOptions(masters.map((m) => ({ id: m.id, name: m.name })));
    setClientStatusSmsEnabled(opts.clientStatusSms);
    setJournalServices(svcList);
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
    fetchJson<{
      login: string;
      isEnvAdmin: boolean;
      masterId: string | null;
      employeeId: string | null;
      permissions: EmployeePermissions;
    }>(`${apiBase}/api/admin/session`)
      .then((data) => {
        setSessionInfo({
          login: typeof data.login === "string" ? data.login : "admin",
          isEnvAdmin: data.isEnvAdmin === true,
          masterId: typeof data.masterId === "string" ? data.masterId : null,
          employeeId: typeof data.employeeId === "string" ? data.employeeId : null,
          permissions: data.permissions ?? DEFAULT_EMPLOYEE_PERMISSIONS,
        });
        setSessionReady(true);
      })
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  useEffect(() => {
    if (!sessionReady || !sessionInfo || isEnvAdmin) return;
    if (tab === "employees") {
      setTab(firstAllowedTab(permissions));
      return;
    }
    if (!canAccessTab(permissions, TAB_PERMISSION[tab] as AdminPermissionTab)) {
      setTab(firstAllowedTab(permissions));
    }
  }, [sessionReady, sessionInfo, isEnvAdmin, permissions, tab, setTab]);

  useEffect(() => {
    const defaultMaster = shiftsLocked ?? sessionInfo?.masterId;
    if (defaultMaster && !selectedShiftMasterId) {
      setSelectedShiftMasterId(defaultMaster);
    }
  }, [shiftsLocked, sessionInfo?.masterId, selectedShiftMasterId]);

  useEffect(() => {
    if (tab === "bookings" || tab === "slot_blocks") {
      loadBookingsAndBlocks().catch((e: Error) => setErr(e.message));
    } else if (tab === "employees" && isEnvAdmin) {
      loadEmployees().catch((e: Error) => setErr(e.message));
    } else if (tab === "shifts") {
      loadSidebarMasters().catch((e: Error) => setErr(e.message));
    } else if (tab === "content" && (isEnvAdmin || canAccessTab(permissions, "content"))) {
      loadContent().catch((e: Error) => setErr(e.message));
    }
  }, [tab, isEnvAdmin, permissions, loadBookingsAndBlocks, loadContent, loadEmployees, loadSidebarMasters]);

  useEffect(() => {
    if (isEnvAdmin) loadEmployees().catch(() => {});
  }, [loadEmployees, isEnvAdmin]);

  useEffect(() => {
    loadSalonHours().catch(() => {});
  }, [loadSalonHours]);

  useEffect(() => {
    if (tab !== "bookings") return;
    loadDayShifts(scheduleDate).catch(() => setDayShifts([]));
  }, [tab, scheduleDate, loadDayShifts]);

  /** SSE + опрос ревизии: журнал обновляется при записи с сайта и правках в админке. */
  useEffect(() => {
    if (!sessionReady) return;
    const url = `${apiBase}/api/admin/bookings/stream`;
    const es = new EventSource(url, { withCredentials: true });

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as {
          reason?: string;
          source?: string;
          slotStart?: string;
        };
        if (
          data.reason === "booking_created" &&
          data.source === "site" &&
          typeof data.slotStart === "string"
        ) {
          const ymd = slotStartLocalYmd(data.slotStart);
          if (ymd) {
            setScheduleDate(ymd);
            setTab("bookings");
            flashSaved("Новая запись с сайта");
          }
        }
      } catch {
        /* ignore malformed SSE payload */
      }
      loadBookingsAndBlocks().catch(() => {});
      if (tabRef.current === "bookings") {
        loadDayShifts(scheduleDateRef.current).catch(() => {});
      }
    };

    return () => {
      es.close();
    };
  }, [sessionReady, loadBookingsAndBlocks, loadDayShifts, flashSaved]);

  useEffect(() => {
    if (tab !== "content") setShowAddMaster(false);
  }, [tab]);

  useEffect(() => {
    if (tab !== "slot_blocks") {
      setSelectedBlockIds([]);
      return;
    }
    if (!visibleBlocks) return;
    const valid = new Set(visibleBlocks.map((b) => b.id));
    setSelectedBlockIds((prev) => prev.filter((id) => valid.has(id)));
  }, [visibleBlocks, tab]);

  useEffect(() => {
    const el = blockSelectAllRef.current;
    if (!el) return;
    if (!visibleBlocks?.length) {
      el.indeterminate = false;
      return;
    }
    const n = selectedBlockIds.length;
    el.indeterminate = n > 0 && n < visibleBlocks.length;
  }, [selectedBlockIds, visibleBlocks]);

  const saveBooking = useCallback(
    async (id: string, payload: BookingJournalSavePayload) => {
      const prev = bookings?.find((x) => x.id === id);
      if (
        prev &&
        prev.status !== payload.status &&
        (payload.status === "confirmed" || payload.status === "cancelled") &&
        clientStatusSmsEnabled &&
        prev.clientPhone.replace(/\D/g, "")
      ) {
        const action =
          payload.status === "confirmed" ? "подтверждении записи" : "отмене записи";
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
            body: JSON.stringify(payload),
          }
        );
        await loadBookingsAndBlocks();
        if (data.clientSms?.send) {
          flashSaved(
            data.clientSms.kind === "confirmed"
              ? "Клиенту отправлено SMS о подтверждении записи."
              : "Клиенту отправлено SMS об отмене записи."
          );
        } else {
          flashSaved("Запись сохранена");
        }
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Ошибка");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [bookings, clientStatusSmsEnabled, loadBookingsAndBlocks, flashSaved]
  );

  const createBooking = useCallback(
    async (payload: BookingJournalSavePayload) => {
      setBusy(true);
      setErr(null);
      try {
        await fetchJson(`${apiBase}/api/admin/bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await loadBookingsAndBlocks();
        flashSaved("Запись создана");
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Ошибка");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [loadBookingsAndBlocks, flashSaved]
  );

  const deleteBooking = useCallback(
    async (id: string) => {
      setBusy(true);
      setErr(null);
      try {
        await fetchJson(`${apiBase}/api/admin/bookings/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        await loadBookingsAndBlocks();
        flashSaved("Запись удалена");
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Ошибка");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [loadBookingsAndBlocks, flashSaved]
  );

  const createBreak = useCallback(
    async (payload: BreakJournalSavePayload) => {
      setBusy(true);
      setErr(null);
      try {
        await fetchJson(`${apiBase}/api/admin/master-breaks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await loadBookingsAndBlocks();
        flashSaved("Перерыв добавлен");
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Ошибка");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [loadBookingsAndBlocks, flashSaved]
  );

  const saveBreak = useCallback(
    async (id: string, payload: BreakJournalSavePayload) => {
      setBusy(true);
      setErr(null);
      try {
        await fetchJson(`${apiBase}/api/admin/master-breaks/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await loadBookingsAndBlocks();
        flashSaved("Перерыв сохранён");
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Ошибка");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [loadBookingsAndBlocks, flashSaved]
  );

  const deleteBreak = useCallback(
    async (id: string) => {
      setBusy(true);
      setErr(null);
      try {
        await fetchJson(`${apiBase}/api/admin/master-breaks/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        await loadBookingsAndBlocks();
        flashSaved("Перерыв удалён");
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Ошибка");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [loadBookingsAndBlocks, flashSaved]
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

  const saveBlockNote = async (id: string, note: string | null) => {
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/slot-blocks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      setEditingBlock(null);
      await loadBookingsAndBlocks();
      flashSaved("Блокировка сохранена");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
      throw e;
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
    if (!visibleBlocks?.length) return;
    if (selectedBlockIds.length === visibleBlocks.length) {
      setSelectedBlockIds([]);
    } else {
      setSelectedBlockIds(visibleBlocks.map((b) => b.id));
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

  useEffect(() => {
    if (tab !== "bookings") return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [tab]);

  if (!sessionReady) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-white/60">
        Загрузка панели…
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <AdminSidebar
        tab={tab as AdminTabId}
        onTabChange={setTab}
        selectedDate={scheduleDate}
        onSelectDate={setScheduleDate}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        isEnvAdmin={isEnvAdmin}
        permissions={permissions}
        userLogin={sessionInfo?.login ?? null}
        employees={(employees ?? []).map((e) => ({ id: e.id, name: e.name }))}
        masters={sidebarMasters}
        selectedEmployeeId={selectedEmployeeId}
        selectedShiftMasterId={selectedShiftMasterId}
        onSelectEmployee={setSelectedEmployeeId}
        onSelectShiftMaster={setSelectedShiftMasterId}
      />
      <div
        className={`flex min-w-0 flex-1 flex-col overflow-hidden ${
          tab === "bookings" ? "" : "overflow-y-auto"
        }`}
      >
        {!isEnvAdmin && permissions.bookingsOwnOnly && !sessionInfo?.masterId ? (
          <div className="mx-4 mt-3 shrink-0 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            У вашей учётной записи не привязан мастер. Обратитесь к администратору.
          </div>
        ) : null}

        <div
          className={
            tab === "bookings"
              ? "flex h-full min-h-0 flex-1 basis-0 flex-col overflow-hidden px-4 pb-3"
              : "min-h-0 flex-1 px-4 pb-4 pt-1"
          }
        >
        {tab === "clients" && (
          <AdminClientsPanel
            busy={busy}
            setBusy={setBusy}
            setErr={setErr}
            flashSaved={flashSaved}
          />
        )}

        {tab === "bookings" && (
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <ScheduleDayView
              date={scheduleDate}
              salonHours={salonHours}
              masters={blockMasterOptions ?? []}
              services={journalServices}
              bookings={bookings}
              breaks={masterBreaks}
              blocks={blocks}
              dayShifts={dayShifts}
              busy={busy}
              ownMasterId={ownMasterId}
              hideOthersPhones={hideOthersPhones}
              viewerMasterId={sessionInfo?.masterId ?? null}
              onSaveBooking={saveBooking}
              onCreateBooking={createBooking}
              onDeleteBooking={deleteBooking}
              onSaveBreak={saveBreak}
              onCreateBreak={createBreak}
              onDeleteBreak={deleteBreak}
            />
          </div>
        )}

        {tab === "slot_blocks" && (
          <div>
            <section>
              <p className="mb-4 text-sm text-white/55">
                {isEnvAdmin || !slotBlocksLocked
                  ? "Заблокированное время недоступно в форме записи. Пункт «Все мастера» — блокировка для всех."
                  : "Заблокированное время недоступно в форме записи. Вы можете блокировать слоты только для себя."}
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
                      disabled={!!slotBlocksLocked}
                      onChange={(e) => blockDate.setMasterId(e.target.value)}
                      className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white disabled:opacity-60"
                    >
                      {isEnvAdmin || !slotBlocksLocked ? (
                        <option value={ALL_MASTERS_BLOCK_ID}>Все мастера</option>
                      ) : null}
                      {(slotBlocksLocked
                        ? blockMasterOptions?.filter((m) => m.id === slotBlocksLocked)
                        : blockMasterOptions
                      )?.map((m) => (
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
              {visibleBlocks && visibleBlocks.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-sm text-white/70">
                    {selectedBlockIds.length > 0 ? (
                      <>
                        Выбрано: <span className="font-semibold text-[var(--accent)]">{selectedBlockIds.length}</span> из{" "}
                        {visibleBlocks.length}
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
                        {visibleBlocks && visibleBlocks.length > 0 ? (
                          <input
                            ref={blockSelectAllRef}
                            type="checkbox"
                            title="Выбрать все"
                            disabled={busy}
                            checked={
                              selectedBlockIds.length > 0 &&
                              selectedBlockIds.length === visibleBlocks.length
                            }
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
                    {!visibleBlocks ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-white/50">
                          Загрузка…
                        </td>
                      </tr>
                    ) : visibleBlocks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-white/50">
                          Нет блокировок
                        </td>
                      </tr>
                    ) : (
                      visibleBlocks.map((s) => {
                        const selected = selectedBlockIds.includes(s.id);
                        const editable = canEditBlock(s);
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
                                disabled={busy || !editable}
                                onChange={() => toggleBlockRowSelected(s.id)}
                                className="h-4 w-4 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
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
                              {editable ? (
                                <div className="flex flex-wrap items-center justify-end gap-3">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setEditingBlock(s)}
                                    className="cursor-pointer text-sm text-[var(--accent)] hover:underline disabled:cursor-not-allowed"
                                  >
                                    Изменить
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => removeBlock(s.id)}
                                    className="cursor-pointer text-sm text-red-300 hover:underline disabled:cursor-not-allowed"
                                  >
                                    Удалить
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-white/35">—</span>
                              )}
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

        {tab === "employees" && isEnvAdmin && (
          <AdminEmployeesPanel
            employees={employees}
            masters={sidebarMasters}
            busy={busy}
            selectedId={selectedEmployeeId}
            onSelect={setSelectedEmployeeId}
            onReload={loadEmployees}
            setBusy={setBusy}
            setErr={setErr}
            flashSaved={flashSaved}
          />
        )}

        {tab === "shifts" && (
          <AdminMasterSchedulePanel
            masters={sidebarMasters}
            salonHours={salonHours}
            selectedMasterId={selectedShiftMasterId}
            onSelectMaster={setSelectedShiftMasterId}
            initialDate={scheduleDate}
            busy={busy}
            setBusy={setBusy}
            setErr={setErr}
            flashSaved={flashSaved}
            lockedMasterId={shiftsLocked}
          />
        )}

        {tab === "content" && siteKv && mastersList && bookingCatalog && (
          <div className="space-y-10">
            <section>
              <h2 className="text-lg font-semibold">Режим работы</h2>
              <p className="mt-1 text-sm text-white/55">
                Часы работы салона для журнала, блокировки слотов и записи на сайте.
              </p>
              <div className="mt-4">
                <SalonHoursEditor
                  config={salonHours}
                  busy={busy}
                  setBusy={setBusy}
                  setErr={setErr}
                  onSaved={(next) => {
                    setSalonHours(next);
                    flashSaved("Режим работы сохранён");
                  }}
                />
              </div>
            </section>

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
      </div>

      {editingBlock ? (
        <SlotBlockEditModal
          block={{
            id: editingBlock.id,
            blockDate: editingBlock.blockDate,
            hour: editingBlock.hour,
            masterLabel:
              editingBlock.masterId === ALL_MASTERS_BLOCK_ID
                ? "Все мастера"
                : blockMasterLabel(editingBlock.masterId),
            note: editingBlock.note,
          }}
          busy={busy}
          onClose={() => setEditingBlock(null)}
          onSave={(note) => saveBlockNote(editingBlock.id, note)}
        />
      ) : null}
      <AdminToast toast={toast} />
    </div>
  );
}

function useBlockForm(salonHours: SalonHoursConfig, lockedMasterId?: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [selectedHours, setSelectedHours] = useState<number[]>([salonHours.startHour]);
  const [masterId, setMasterId] = useState(lockedMasterId ?? ALL_MASTERS_BLOCK_ID);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (lockedMasterId) setMasterId(lockedMasterId);
  }, [lockedMasterId]);

  useEffect(() => {
    setSelectedHours((prev) =>
      prev.filter((h) => h >= salonHours.startHour && h < salonHours.endHourExclusive)
    );
  }, [salonHours.startHour, salonHours.endHourExclusive]);

  const toggleHour = (h: number) => {
    setSelectedHours((prev) => {
      const s = new Set(prev);
      if (s.has(h)) s.delete(h);
      else s.add(h);
      return Array.from(s).sort((a, b) => a - b);
    });
  };

  const selectAllHours = () => setSelectedHours(salonHourOptionsFrom(salonHours));
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
            <MasterPhotoThumbnail
              photoPath={photoPath}
              busy={busy}
              size="sm"
              onClear={() => setPhotoPath("")}
            />
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
            <MasterPhotoThumbnail
              photoPath={photoPath}
              busy={busy}
              size="lg"
              onClear={() => setPhotoPath("")}
            />
            {!photoPath.trim() ? (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 text-xs text-white/40">
                Нет фото
              </div>
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
