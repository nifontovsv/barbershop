"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiBase } from "@/lib/basePath";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ login: login.trim() || undefined, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok) {
        setError(data.message ?? "Ошибка входа");
        return;
      }
      const from = searchParams.get("from");
      router.replace(from && from.startsWith("/admin") ? from : "/admin");
      router.refresh();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--surface)] p-8 shadow-xl">
        <h1 className="text-center text-xl font-semibold text-[var(--text)]">Вход в админку</h1>
        <p className="mt-2 text-center text-sm text-white/60">
          Логин и пароль (админ из .env или сотрудник). Без логина — только пароль админа
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs text-white/55">Логин (необязательно)</span>
            <input
              type="text"
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-[var(--text)] outline-none placeholder:text-white/40 focus:border-[var(--accent)]"
              placeholder="Логин сотрудника"
              disabled={loading}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/55">Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-[var(--text)] outline-none ring-0 placeholder:text-white/40 focus:border-[var(--accent)]"
              placeholder="Пароль"
              disabled={loading}
            />
          </label>
          {error && (
            <p className="text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full cursor-pointer rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-black transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
