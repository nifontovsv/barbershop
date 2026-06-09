"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiBase } from "@/lib/basePath";
import {
  lastVisitStatusClass,
  lastVisitStatusLabel,
  type ClientVisitStatusFilter,
} from "@/lib/clientDisplay";
import { formatPhoneDisplay } from "@/lib/phoneInput";

export interface ClientRow {
  clientPhone: string;
  displayName: string;
  clientEmail: string | null;
  visitCount: number;
  firstSlotStart: string;
  lastSlotStart: string;
  lastVisitStatus: string;
}

const BTN_PRIMARY =
  "cursor-pointer rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SECONDARY =
  "cursor-pointer rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err?.message === "string" ? err.message : res.statusText);
  }
  return res.json() as Promise<T>;
}

function formatSlotLocal(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AdminClientsPanel({
  busy,
  setBusy,
  setErr,
  flashSaved,
}: {
  busy: boolean;
  setBusy: (b: boolean) => void;
  setErr: (s: string | null) => void;
  flashSaved: (msg?: string) => void;
}) {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientVisitStatusFilter>("all");
  const [visitsMin, setVisitsMin] = useState(0);
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifySubject, setNotifySubject] = useState("Barbershop");
  const [sendSms, setSendSms] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const loadClients = useCallback(
    async (searchQuery: string) => {
      setErr(null);
      const params = new URLSearchParams();
      const q = searchQuery.trim();
      if (q) params.set("search", q);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (visitsMin > 0) params.set("visitsMin", String(visitsMin));
      const qs = params.toString();
      const data = await fetchJson<ClientRow[]>(
        `${apiBase}/api/admin/clients${qs ? `?${qs}` : ""}`
      );
      setClients(data);
      setSelectedPhones((prev) => prev.filter((p) => data.some((c) => c.clientPhone === p)));
    },
    [statusFilter, visitsMin, setErr]
  );

  useEffect(() => {
    const delay = search.trim() === "" ? 0 : 250;
    const timer = window.setTimeout(() => {
      loadClients(search).catch((e: Error) => setErr(e.message));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [search, statusFilter, visitsMin, loadClients, setErr]);

  const selectedClients = useMemo(() => {
    if (!clients) return [];
    const set = new Set(selectedPhones);
    return clients.filter((c) => set.has(c.clientPhone));
  }, [clients, selectedPhones]);

  const selectedWithEmail = useMemo(
    () => selectedClients.filter((c) => c.clientEmail),
    [selectedClients]
  );

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el || !clients?.length) return;
    const n = selectedPhones.length;
    el.indeterminate = n > 0 && n < clients.length;
  }, [selectedPhones, clients]);

  const toggleRow = (phone: string) => {
    setSelectedPhones((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]
    );
  };

  const toggleAll = () => {
    if (!clients?.length) return;
    if (selectedPhones.length === clients.length) {
      setSelectedPhones([]);
    } else {
      setSelectedPhones(clients.map((c) => c.clientPhone));
    }
  };

  const sendNotify = async () => {
    if (selectedPhones.length === 0) {
      setErr("Выберите клиентов");
      return;
    }
    if (!notifyMessage.trim()) {
      setErr("Введите текст сообщения");
      return;
    }
    if (!sendSms && !sendEmail) {
      setErr("Выберите SMS или Email");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const result = await fetchJson<{
        sms: { sent: number; failed: string[] };
        email: { sent: number; failed: string[] };
      }>(`${apiBase}/api/admin/clients/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientPhones: selectedPhones,
          message: notifyMessage.trim(),
          emailSubject: notifySubject.trim() || "Barbershop",
          sendSms,
          sendEmail,
        }),
      });
      const parts: string[] = [];
      if (sendSms) parts.push(`SMS: ${result.sms.sent}`);
      if (sendEmail) parts.push(`Email: ${result.email.sent}`);
      flashSaved(parts.join(", ") || "Готово");
      setNotifyOpen(false);
      setNotifyMessage("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-[var(--surface)]/40 p-4">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs text-white/65">
          Поиск
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Имя, телефон или email"
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/65">
          Статус последнего визита
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ClientVisitStatusFilter)}
            className="min-w-[160px] rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="all">Все</option>
            <option value="done">Пришёл</option>
            <option value="cancelled">Не пришёл</option>
            <option value="planned">Запланирован</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/65">
          Визитов от
          <select
            value={visitsMin}
            onChange={(e) => setVisitsMin(Number(e.target.value))}
            className="min-w-[100px] rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value={0}>Любое</option>
            <option value={1}>1+</option>
            <option value={3}>3+</option>
            <option value={5}>5+</option>
            <option value={10}>10+</option>
          </select>
        </label>
      </div>

      {clients && clients.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-sm text-white/70">
            {selectedPhones.length > 0 ? (
              <>
                Выбрано: <span className="font-semibold text-[var(--accent)]">{selectedPhones.length}</span> из{" "}
                {clients.length}
              </>
            ) : (
              <>Отметьте клиентов для массовой рассылки</>
            )}
          </p>
          <button
            type="button"
            disabled={busy || selectedPhones.length === 0}
            onClick={() => setNotifyOpen(true)}
            className={BTN_SECONDARY}
          >
            Отправить сообщение
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[var(--surface)]/60">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-white/60">
            <tr>
              <th className="w-10 px-2 py-3">
                {clients && clients.length > 0 ? (
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    disabled={busy}
                    checked={clients.length > 0 && selectedPhones.length === clients.length}
                    onChange={toggleAll}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                ) : null}
              </th>
              <th className="px-3 py-3 font-medium">Имя</th>
              <th className="px-3 py-3 font-medium">Телефон</th>
              <th className="px-3 py-3 font-medium">Email</th>
              <th className="px-3 py-3 font-medium">Визиты</th>
              <th className="px-3 py-3 font-medium">Статус</th>
              <th className="px-3 py-3 font-medium">Последний визит</th>
              <th className="px-3 py-3 font-medium">Первый визит</th>
            </tr>
          </thead>
          <tbody>
            {!clients ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/50">
                  Загрузка…
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/50">
                  Клиенты не найдены
                </td>
              </tr>
            ) : (
              clients.map((c) => {
                const selected = selectedPhones.includes(c.clientPhone);
                return (
                  <tr
                    key={c.clientPhone}
                    className={`border-b border-white/5 transition-colors ${
                      selected ? "bg-[var(--accent)]/10" : "hover:bg-white/5"
                    }`}
                  >
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={busy}
                        onChange={() => toggleRow(c.clientPhone)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-white/90">{c.displayName}</td>
                    <td className="px-3 py-2 font-mono text-white/80">{formatPhoneDisplay(c.clientPhone)}</td>
                    <td className="px-3 py-2 text-white/70">{c.clientEmail ?? "—"}</td>
                    <td className="px-3 py-2">{c.visitCount}</td>
                    <td className={`px-3 py-2 font-medium ${lastVisitStatusClass(c.lastVisitStatus)}`}>
                      {lastVisitStatusLabel(c.lastVisitStatus)}
                    </td>
                    <td className="px-3 py-2 text-white/75">{formatSlotLocal(c.lastSlotStart)}</td>
                    <td className="px-3 py-2 text-white/75">{formatSlotLocal(c.firstSlotStart)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {notifyOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-3"
          onClick={() => setNotifyOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-(--bg-content) p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h3 className="text-base font-semibold text-white/95">Отправить сообщение</h3>
            <p className="mt-1 text-sm text-white/55">
              Выбрано клиентов: {selectedClients.length}
              {sendEmail ? ` · с email: ${selectedWithEmail.length}` : ""}
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={sendSms}
                  onChange={(e) => setSendSms(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                SMS (через SMS.ru)
              </label>
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                Email (SMTP)
              </label>
              {sendEmail ? (
                <label className="block text-xs text-white/65">
                  Тема письма
                  <input
                    type="text"
                    value={notifySubject}
                    onChange={(e) => setNotifySubject(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                  />
                </label>
              ) : null}
              <label className="block text-xs text-white/65">
                Текст сообщения
                <textarea
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  rows={4}
                  className="mt-1 w-full resize-none rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                  placeholder="Текст для SMS и/или письма"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setNotifyOpen(false)} className={BTN_SECONDARY}>
                Отмена
              </button>
              <button type="button" disabled={busy} onClick={() => void sendNotify()} className={BTN_PRIMARY}>
                Отправить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
