"use client";

import { useState } from "react";
import { apiBase } from "@/lib/basePath";
import {
  clonePermissions,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  type EmployeePermissions,
} from "@/lib/adminPermissions";
import {
  EmployeePermissionsEditor,
  INPUT,
} from "@/components/admin/EmployeePermissionsEditor";

export interface EmployeeListItem {
  id: string;
  name: string;
  login: string;
  masterId: string | null;
  masterName: string | null;
  permissions: EmployeePermissions;
  isActive: number;
  hasAccess: boolean;
  createdAt: string;
}

interface MasterOption {
  id: string;
  name: string;
}

const BTN_PRIMARY =
  "cursor-pointer rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_DANGER =
  "cursor-pointer rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err?.message === "string" ? err.message : res.statusText);
  }
  return res.json() as Promise<T>;
}

export function AdminEmployeesPanel({
  employees,
  masters,
  busy,
  selectedId,
  onSelect,
  onReload,
  setBusy,
  setErr,
  flashSaved,
}: {
  employees: EmployeeListItem[] | null;
  masters: MasterOption[];
  busy: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onReload: () => Promise<void>;
  setBusy: (b: boolean) => void;
  setErr: (s: string | null) => void;
  flashSaved: (msg?: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const selected = employees?.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/55">
        Добавляйте сотрудников с доступом в админку, привязывайте к профилю мастера на сайте и
        настраивайте, какие разделы и действия им доступны. Управление сотрудниками — только у
        главного администратора из .env.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setShowAdd(true);
            onSelect(null);
          }}
          className="cursor-pointer rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Добавить сотрудника
        </button>
      </div>

      {showAdd ? (
        <AddEmployeeForm
          masters={masters}
          busy={busy}
          onCancel={() => setShowAdd(false)}
          onCreated={async (id) => {
            await onReload();
            setShowAdd(false);
            onSelect(id);
            flashSaved("Сотрудник добавлен");
          }}
          setBusy={setBusy}
          setErr={setErr}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface)]/60">
          {!employees ? (
            <p className="px-4 py-8 text-center text-sm text-white/50">Загрузка…</p>
          ) : employees.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-white/50">Пока нет сотрудников</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {employees.map((e) => {
                const active = e.id === selectedId;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(e.id)}
                      className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition ${
                        active ? "bg-[var(--accent)]/15" : "hover:bg-white/5"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-200">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                          <circle cx="12" cy="8" r="3.5" />
                          <path d="M5 20c0-3.5 3.5-6 7-6s7 2.5 7 6" />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-white/90">{e.name}</span>
                        <span className="block truncate text-xs text-white/45">
                          {e.hasAccess ? e.login : "Без доступа"}
                          {e.masterName ? ` · ${e.masterName}` : ""}
                        </span>
                      </span>
                      {e.hasAccess ? (
                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                          доступ
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/45">
                          нет доступа
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selected ? (
          <EmployeeEditor
            key={selected.id}
            employee={selected}
            masters={masters}
            busy={busy}
            onReload={onReload}
            onDeleted={() => {
              onSelect(null);
              flashSaved("Сотрудник удалён");
            }}
            setBusy={setBusy}
            setErr={setErr}
            flashSaved={flashSaved}
          />
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/15 px-6 py-16 text-sm text-white/45">
            Выберите сотрудника или добавьте нового
          </div>
        )}
      </div>
    </div>
  );
}

function AddEmployeeForm({
  masters,
  busy,
  onCancel,
  onCreated,
  setBusy,
  setErr,
}: {
  masters: MasterOption[];
  busy: boolean;
  onCancel: () => void;
  onCreated: (id: string) => Promise<void>;
  setBusy: (b: boolean) => void;
  setErr: (s: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [masterId, setMasterId] = useState("");
  const [permissions, setPermissions] = useState(() => clonePermissions(DEFAULT_EMPLOYEE_PERMISSIONS));

  const submit = async () => {
    if (!name.trim() || !login.trim()) {
      setErr("Укажите имя и логин");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const row = await fetchJson<EmployeeListItem>(`${apiBase}/api/admin/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          login: login.trim(),
          password: password || undefined,
          masterId: masterId || null,
          permissions,
        }),
      });
      await onCreated(row.id);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--accent)]/35 bg-[var(--surface)]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-white/90">Новый сотрудник</span>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={onCancel} className={BTN_DANGER}>
            Отмена
          </button>
          <button type="button" disabled={busy} onClick={() => void submit()} className={BTN_PRIMARY}>
            Создать
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/65">
          Имя
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
        </label>
        <label className="text-xs text-white/65">
          Логин
          <input value={login} onChange={(e) => setLogin(e.target.value)} className={INPUT} autoComplete="off" />
        </label>
        <label className="text-xs text-white/65">
          Пароль (не короче 6 символов)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
            autoComplete="new-password"
          />
        </label>
        <label className="text-xs text-white/65 sm:col-span-2">
          Профиль мастера на сайте
          <select value={masterId} onChange={(e) => setMasterId(e.target.value)} className={INPUT}>
            <option value="">Не привязан</option>
            {masters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4">
        <EmployeePermissionsEditor value={permissions} onChange={setPermissions} disabled={busy} />
      </div>
    </div>
  );
}

function EmployeeEditor({
  employee,
  masters,
  busy,
  onReload,
  onDeleted,
  setBusy,
  setErr,
  flashSaved,
}: {
  employee: EmployeeListItem;
  masters: MasterOption[];
  busy: boolean;
  onReload: () => Promise<void>;
  onDeleted: () => void;
  setBusy: (b: boolean) => void;
  setErr: (s: string | null) => void;
  flashSaved: (msg?: string) => void;
}) {
  const [name, setName] = useState(employee.name);
  const [login, setLogin] = useState(employee.login);
  const [password, setPassword] = useState("");
  const [masterId, setMasterId] = useState(employee.masterId ?? "");
  const [permissions, setPermissions] = useState(() => clonePermissions(employee.permissions));
  const [isActive, setIsActive] = useState(employee.isActive === 1);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/employees/${encodeURIComponent(employee.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          login: login.trim(),
          masterId: masterId || null,
          permissions,
          isActive,
          ...(password ? { password } : {}),
        }),
      });
      await onReload();
      setPassword("");
      flashSaved("Сохранено");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const grantAccess = async () => {
    if (!password || password.length < 6) {
      setErr("Задайте пароль не короче 6 символов");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/employees/${encodeURIComponent(employee.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, isActive: true }),
      });
      await onReload();
      setPassword("");
      flashSaved("Доступ выдан");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const revokeAccess = async () => {
    if (!confirm("Отозвать доступ? Сотрудник не сможет войти в админку.")) return;
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/employees/${encodeURIComponent(employee.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revokeAccess: true }),
      });
      await onReload();
      flashSaved("Доступ отозван");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Удалить сотрудника «${employee.name}»?`)) return;
    setBusy(true);
    setErr(null);
    try {
      await fetchJson(`${apiBase}/api/admin/employees/${encodeURIComponent(employee.id)}`, {
        method: "DELETE",
      });
      await onReload();
      onDeleted();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-white/90">{employee.name}</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void remove()} className={BTN_DANGER}>
            Удалить
          </button>
          <button type="button" disabled={busy} onClick={() => void save()} className={BTN_PRIMARY}>
            Сохранить
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/65">
          Имя
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
        </label>
        <label className="text-xs text-white/65">
          Логин
          <input value={login} onChange={(e) => setLogin(e.target.value)} className={INPUT} />
        </label>
        <label className="text-xs text-white/65">
          Новый пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={employee.hasAccess ? "Оставьте пустым, чтобы не менять" : "Для выдачи доступа"}
            className={INPUT}
            autoComplete="new-password"
          />
        </label>
        <label className="text-xs text-white/65 sm:col-span-2">
          Профиль мастера на сайте
          <select value={masterId} onChange={(e) => setMasterId(e.target.value)} className={INPUT}>
            <option value="">Не привязан</option>
            {masters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-white/80 sm:col-span-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Активен
        </label>
      </div>

      <div className="mt-4">
        <EmployeePermissionsEditor value={permissions} onChange={setPermissions} disabled={busy} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
        {employee.hasAccess ? (
          <button type="button" disabled={busy} onClick={() => void revokeAccess()} className={BTN_DANGER}>
            Отозвать доступ
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => void grantAccess()} className={BTN_PRIMARY}>
            Выдать доступ
          </button>
        )}
      </div>
    </div>
  );
}
