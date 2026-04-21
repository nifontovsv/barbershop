"use client";

import { useEffect, useMemo, useState } from "react";
import { IntField } from "@/components/admin/NumericInputs";
import { apiBase, asset } from "@/lib/basePath";
import type { HeaderContent, ParallaxBgContent } from "@/lib/sitePublic";
import type { Service, ServiceCategory } from "@/types/booking";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err?.message === "string" ? err.message : res.statusText);
  }
  return res.json() as Promise<T>;
}

async function uploadSiteImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("subdir", "site");
  const res = await fetch(`${apiBase}/api/admin/upload`, { method: "POST", body: fd, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Ошибка загрузки");
  return String(data.path ?? "");
}

async function uploadParallaxImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("subdir", "parallax");
  const res = await fetch(`${apiBase}/api/admin/upload`, { method: "POST", body: fd, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Ошибка загрузки");
  return String(data.path ?? "");
}

function mediaSrc(path: string): string {
  return asset(path.startsWith("/") ? path : `/${path}`);
}

const BTN_PRIMARY =
  "cursor-pointer rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-black transition-all duration-200 hover:brightness-110 hover:shadow-md hover:shadow-[var(--accent)]/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const FILE_SITE =
  "mt-1 block text-sm file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-black file:transition-all file:hover:brightness-110";

export function ParallaxBgEditor({
  raw,
  busy,
  onSave,
  setErr,
}: {
  raw: string | undefined;
  busy: boolean;
  onSave: (data: ParallaxBgContent) => void | Promise<void>;
  setErr: (s: string | null) => void;
}) {
  const parse = (): ParallaxBgContent => {
    if (!raw) return {};
    try {
      return JSON.parse(raw) as ParallaxBgContent;
    } catch {
      return {};
    }
  };
  const p = parse();
  const [imagePath, setImagePath] = useState(p.imagePath ?? "/images/parallax/parallax-bikes.jpg");

  useEffect(() => {
    const n = parse();
    setImagePath(n.imagePath ?? "/images/parallax/parallax-bikes.jpg");
  }, [raw]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-white/90">Фон сайта (параллакс)</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSave({ imagePath: imagePath.trim() || undefined })}
          className={BTN_PRIMARY}
        >
          Сохранить
        </button>
      </div>
      <p className="mt-2 text-xs text-white/45">
        Фоновое изображение за всем контентом (эффект параллакса на экранах от 768px). Рекомендуется
        горизонтальное фото хорошего качества.
      </p>
      <div className="mt-4 space-y-3">
        {imagePath.trim() ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaSrc(imagePath.trim())}
            alt=""
            className="max-h-40 w-full max-w-lg rounded-xl border border-white/15 object-cover object-center"
          />
        ) : null}
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs text-white/60">
            Загрузить изображение
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                uploadParallaxImage(f)
                  .then((path) => setImagePath(path))
                  .catch((err: unknown) =>
                    setErr(err instanceof Error ? err.message : "Ошибка загрузки")
                  )
                  .finally(() => {
                    e.target.value = "";
                  });
              }}
              className={FILE_SITE}
            />
          </label>
          <label className="flex min-w-[220px] flex-1 flex-col text-xs text-white/65">
            Путь к файлу
            <input
              value={imagePath}
              onChange={(e) => setImagePath(e.target.value)}
              placeholder="/images/parallax/... или /uploads/parallax/..."
              className="mt-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export function HeaderSiteEditor({
  raw,
  busy,
  onSave,
  setErr,
}: {
  raw: string | undefined;
  busy: boolean;
  onSave: (data: HeaderContent) => void | Promise<void>;
  setErr: (s: string | null) => void;
}) {
  const parse = (): HeaderContent => {
    if (!raw) return {};
    try {
      return JSON.parse(raw) as HeaderContent;
    } catch {
      return {};
    }
  };
  const p = parse();
  const [logoPath, setLogoPath] = useState(p.logoPath ?? "/logo.png");
  const [title, setTitle] = useState(p.title ?? "Мужская Парикмахерская");
  const [phoneTel, setPhoneTel] = useState(p.phoneTel ?? "+79179359828");
  const [phoneDisplay, setPhoneDisplay] = useState(p.phoneDisplay ?? "+7 (917) 935-98-28");

  useEffect(() => {
    const n = parse();
    setLogoPath(n.logoPath ?? "/logo.png");
    setTitle(n.title ?? "Мужская Парикмахерская");
    setPhoneTel(n.phoneTel ?? "+79179359828");
    setPhoneDisplay(n.phoneDisplay ?? "+7 (917) 935-98-28");
  }, [raw]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-white/90">Шапка сайта</span>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void onSave({
              logoPath: logoPath || undefined,
              title: title || undefined,
              phoneTel: phoneTel || undefined,
              phoneDisplay: phoneDisplay || undefined,
            })
          }
          className={BTN_PRIMARY}
        >
          Сохранить
        </button>
      </div>
      <p className="mt-2 text-xs text-white/45">
        Логотип и тексты в фиксированной шапке. Номер в поле «Для звонка» — как в tel (без пробелов).
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        {logoPath.trim() ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaSrc(logoPath.trim())}
            alt=""
            className="h-14 w-14 rounded-lg border border-white/15 object-contain"
          />
        ) : null}
        <label className="text-xs text-white/60">
          Загрузить логотип
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              uploadSiteImage(f)
                .then((path) => setLogoPath(path))
                .catch((err: unknown) =>
                  setErr(err instanceof Error ? err.message : "Ошибка загрузки")
                )
                .finally(() => {
                  e.target.value = "";
                });
            }}
            className={FILE_SITE}
          />
        </label>
        <label className="flex min-w-[200px] flex-1 flex-col text-xs text-white/65">
          Путь к логотипу
          <input
            value={logoPath}
            onChange={(e) => setLogoPath(e.target.value)}
            placeholder="/logo.png"
            className="mt-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white"
          />
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/65 sm:col-span-2">
          Название рядом с логотипом
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65">
          Номер (для tel:)
          <input
            value={phoneTel}
            onChange={(e) => setPhoneTel(e.target.value)}
            placeholder="+79171234567"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/65">
          Как показать номер
          <input
            value={phoneDisplay}
            onChange={(e) => setPhoneDisplay(e.target.value)}
            placeholder="+7 (917) 123-45-67"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
    </div>
  );
}

function ServiceEditRow({
  service,
  categories,
  busy,
  onReload,
  setErr,
  setBusy,
  flashSaved,
}: {
  service: Service;
  categories: ServiceCategory[];
  busy: boolean;
  onReload: () => Promise<void>;
  setErr: (s: string | null) => void;
  setBusy: (b: boolean) => void;
  flashSaved: (msg?: string) => void;
}) {
  const [name, setName] = useState(service.name);
  const [durationMinutes, setDurationMinutes] = useState(service.durationMinutes);
  const [price, setPrice] = useState(service.price != null ? String(service.price) : "");
  const [sortOrder, setSortOrder] = useState(service.sortOrder);
  const [categoryId, setCategoryId] = useState(service.categoryId ?? "");

  useEffect(() => {
    setName(service.name);
    setDurationMinutes(service.durationMinutes);
    setPrice(service.price != null ? String(service.price) : "");
    setSortOrder(service.sortOrder);
    setCategoryId(service.categoryId ?? "");
  }, [service]);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
        setErr("Длительность не меньше 1 минуты");
        setBusy(false);
        return;
      }
      const priceNum = price.trim() === "" ? null : Number(price);
      if (price.trim() !== "" && !Number.isFinite(priceNum)) {
        setErr("Некорректная цена");
        setBusy(false);
        return;
      }
      if (!categoryId.trim()) {
        setErr("Выберите категорию");
        setBusy(false);
        return;
      }
      await fetchJson(`${apiBase}/api/admin/services/${encodeURIComponent(service.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          durationMinutes,
          price: priceNum,
          sortOrder,
          categoryId,
        }),
      });
      await onReload();
      flashSaved("Сохранено");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Удалить услугу «${service.name}»?`)) return;
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/services/${encodeURIComponent(service.id)}`, {
        method: "DELETE",
      });
      await onReload();
      flashSaved("Услуга удалена");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const sortedCats = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <tr className="border-b border-white/10">
      <td className="px-2 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full min-w-[140px] rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
        />
      </td>
      <td className="px-2 py-2">
        <IntField
          value={durationMinutes}
          onChange={setDurationMinutes}
          min={1}
          disabled={busy}
          className="w-20 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
        />
      </td>
      <td className="px-2 py-2">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="—"
          className="w-24 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
        />
      </td>
      <td className="px-2 py-2">
        <IntField
          value={sortOrder}
          onChange={setSortOrder}
          disabled={busy}
          className="w-16 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
        />
      </td>
      <td className="px-2 py-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="max-w-[180px] rounded border border-white/15 bg-black/40 px-2 py-1 text-xs text-white"
        >
          <option value="">—</option>
          {sortedCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2 text-right">
        <button type="button" disabled={busy} onClick={() => void save()} className={`${BTN_PRIMARY} mr-2`}>
          Сохранить
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="cursor-pointer text-xs text-red-300 hover:underline disabled:cursor-not-allowed"
        >
          Удалить
        </button>
      </td>
    </tr>
  );
}

export function BookingCatalogEditor({
  categories,
  services,
  busy,
  onReload,
  setErr,
  setBusy,
  flashSaved,
}: {
  categories: ServiceCategory[];
  services: Service[];
  busy: boolean;
  onReload: () => Promise<void>;
  setErr: (s: string | null) => void;
  setBusy: (b: boolean) => void;
  flashSaved: (msg?: string) => void;
}) {
  const [newCatName, setNewCatName] = useState("");
  const [newCatOrder, setNewCatOrder] = useState(0);
  const [newSvc, setNewSvc] = useState({
    name: "",
    durationMinutes: 45,
    price: "",
    sortOrder: 0,
    categoryId: "",
  });

  const addCategory = async () => {
    if (!newCatName.trim()) {
      setErr("Введите название категории");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/service-categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), sortOrder: newCatOrder }),
      });
      setNewCatName("");
      setNewCatOrder(0);
      await onReload();
      flashSaved("Категория добавлена");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const saveCategoryRow = async (c: ServiceCategory, name: string, sortOrder: number) => {
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/service-categories/${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sortOrder }),
      });
      await onReload();
      flashSaved("Сохранено");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = async (c: ServiceCategory) => {
    if (!confirm(`Удалить категорию «${c.name}»? Сначала перенесите услуги в другую категорию.`)) return;
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/service-categories/${encodeURIComponent(c.id)}`, {
        method: "DELETE",
      });
      await onReload();
      flashSaved("Категория удалена");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const addService = async () => {
    if (!newSvc.name.trim() || !newSvc.categoryId) {
      setErr("Укажите название услуги и категорию");
      return;
    }
    if (!Number.isFinite(newSvc.durationMinutes) || newSvc.durationMinutes < 1) {
      setErr("Укажите длительность не меньше 1 минуты");
      return;
    }
    const priceNum = newSvc.price.trim() === "" ? null : Number(newSvc.price);
    if (newSvc.price.trim() !== "" && !Number.isFinite(priceNum)) {
      setErr("Некорректная цена");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSvc.name.trim(),
          durationMinutes: newSvc.durationMinutes,
          price: priceNum,
          sortOrder: newSvc.sortOrder,
          categoryId: newSvc.categoryId,
        }),
      });
      setNewSvc({ name: "", durationMinutes: 45, price: "", sortOrder: 0, categoryId: newSvc.categoryId });
      await onReload();
      flashSaved("Услуга добавлена");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const sortedCats = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  /** На сайте услуги сортируются по полю «порядок» только внутри категории; категория задаётся отдельно. */
  const serviceTableGroups = useMemo(() => {
    const knownCatIds = new Set(categories.map((c) => c.id));
    const catsOrdered = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    const groups: { headerKey: string; title: string; hint?: string; rows: Service[] }[] = [];

    for (const cat of catsOrdered) {
      const rows = services
        .filter((s) => s.categoryId === cat.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      if (rows.length > 0) {
        groups.push({ headerKey: cat.id, title: cat.name, rows });
      }
    }

    const orphan = services
      .filter((s) => !s.categoryId || !knownCatIds.has(s.categoryId))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    if (orphan.length > 0) {
      groups.push({
        headerKey: "_orphan",
        title: "Без категории",
        hint: "выберите категорию в колонке справа",
        rows: orphan,
      });
    }

    return groups;
  }, [categories, services]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)]/50 p-4">
      <h3 className="font-medium text-white/90">Запись на сайте: категории и услуги</h3>
      <p className="mt-1 text-sm text-white/55">
        Категории задают группы в окне «Записаться». Цена в рублях; пустая цена — без отображения суммы.
        Новые услуги автоматически доступны всем мастерам.
      </p>

      <div className="mt-6">
        <h4 className="text-sm font-medium text-white/80">Категории</h4>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Название"
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
          <label className="text-xs text-white/55">
            Порядок
            <div className="mt-1">
              <IntField
                value={newCatOrder}
                onChange={setNewCatOrder}
                disabled={busy}
                className="w-20 rounded border border-white/15 bg-black/30 px-2 py-1 text-sm text-white"
              />
            </div>
          </label>
          <button type="button" disabled={busy} onClick={() => void addCategory()} className={BTN_PRIMARY}>
            Добавить категорию
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {sortedCats.map((c) => (
            <CategoryRow
              key={c.id}
              cat={c}
              busy={busy}
              onSave={(name, order) => void saveCategoryRow(c, name, order)}
              onDelete={() => void deleteCategory(c)}
            />
          ))}
        </ul>
      </div>

      <div className="mt-8">
        <h4 className="text-sm font-medium text-white/80">Услуги</h4>
        <p className="mt-1 max-w-3xl text-xs text-white/45">
          Порядок в колонке «Пор.» действует только внутри выбранной категории (как в окне записи на сайте).
          Смена порядка не переносит услугу в другую категорию — категория задаётся отдельно.
        </p>
        <div className="mt-2 overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-white/55">
              <tr>
                <th className="px-2 py-2">Название</th>
                <th className="px-2 py-2">Мин</th>
                <th className="px-2 py-2">Цена ₽</th>
                <th className="px-2 py-2">Пор. в кат.</th>
                <th className="px-2 py-2">Категория</th>
                <th className="px-2 py-2 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {serviceTableGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                    Пока нет услуг
                  </td>
                </tr>
              ) : (
                serviceTableGroups.flatMap((g) => [
                  <tr key={`grp-${g.headerKey}`} className="bg-black/35">
                    <td colSpan={6} className="px-2 py-2.5 text-xs font-semibold text-[var(--accent)]">
                      {g.title}
                      {g.hint ? (
                        <span className="ml-2 font-normal text-white/45">— {g.hint}</span>
                      ) : null}
                    </td>
                  </tr>,
                  ...g.rows.map((s) => (
                    <ServiceEditRow
                      key={s.id}
                      service={s}
                      categories={categories}
                      busy={busy}
                      onReload={onReload}
                      setErr={setErr}
                      setBusy={setBusy}
                      flashSaved={flashSaved}
                    />
                  )),
                ])
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-white/20 bg-black/20 p-3">
          <span className="w-full text-xs text-white/55">
            Новая услуга — порядок ниже относится к выбранной категории
          </span>
          <input
            value={newSvc.name}
            onChange={(e) => setNewSvc((p) => ({ ...p, name: e.target.value }))}
            placeholder="Название"
            className="rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
          />
          <IntField
            value={newSvc.durationMinutes}
            onChange={(n) => setNewSvc((p) => ({ ...p, durationMinutes: n }))}
            min={1}
            disabled={busy}
            className="w-20 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
          />
          <input
            value={newSvc.price}
            onChange={(e) => setNewSvc((p) => ({ ...p, price: e.target.value }))}
            placeholder="Цена"
            className="w-24 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
          />
          <IntField
            value={newSvc.sortOrder}
            onChange={(n) => setNewSvc((p) => ({ ...p, sortOrder: n }))}
            disabled={busy}
            className="w-16 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
          />
          <select
            value={newSvc.categoryId}
            onChange={(e) => setNewSvc((p) => ({ ...p, categoryId: e.target.value }))}
            className="rounded border border-white/15 bg-black/40 px-2 py-1 text-xs text-white"
          >
            <option value="">Категория</option>
            {sortedCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="button" disabled={busy} onClick={() => void addService()} className={BTN_PRIMARY}>
            Добавить услугу
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  cat,
  busy,
  onSave,
  onDelete,
}: {
  cat: ServiceCategory;
  busy: boolean;
  onSave: (name: string, sortOrder: number) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(cat.name);
  const [sortOrder, setSortOrder] = useState(cat.sortOrder);
  useEffect(() => {
    setName(cat.name);
    setSortOrder(cat.sortOrder);
  }, [cat]);

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="min-w-[160px] flex-1 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
      />
      <IntField
        value={sortOrder}
        onChange={setSortOrder}
        disabled={busy}
        className="w-20 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
      />
      <button type="button" disabled={busy} onClick={() => onSave(name, sortOrder)} className={BTN_PRIMARY}>
        Сохранить
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className="cursor-pointer text-xs text-red-300 hover:underline disabled:cursor-not-allowed"
      >
        Удалить
      </button>
    </li>
  );
}
