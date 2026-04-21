"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { apiBase } from "@/lib/basePath";

export function AdminHeader() {
  const router = useRouter();

  const logout = useCallback(async () => {
    await fetch(`${apiBase}/api/admin/logout`, { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }, [router]);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[var(--bg)]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg)]/80">
      <Link href="/admin" className="font-semibold tracking-tight text-[var(--accent)]">
        Админ-панель
      </Link>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-sm text-white/70 underline-offset-2 hover:text-white hover:underline"
        >
          На сайт
        </Link>
        <button
          type="button"
          onClick={logout}
          className="cursor-pointer rounded-lg border border-white/15 bg-[var(--surface)] px-3 py-1.5 text-sm text-white/90 transition hover:border-white/25"
        >
          Выйти
        </button>
      </div>
    </header>
  );
}
