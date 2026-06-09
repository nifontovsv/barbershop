"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export type AdminToastPayload = {
  message: string;
  type: "success" | "error";
  key: number;
};

export function AdminToast({ toast }: { toast: AdminToastPayload | null }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || !toast) return null;

  const isSuccess = toast.type === "success";

  return createPortal(
    <div
      key={toast.key}
      role="status"
      aria-live="polite"
      className={`animate-admin-toast-in fixed bottom-4 right-4 z-200 flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-sm ${
        isSuccess
          ? "border-emerald-500/45 bg-emerald-950/92 text-emerald-50 shadow-emerald-950/40"
          : "border-red-500/45 bg-red-950/92 text-red-50 shadow-red-950/40"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ring-2 ${
          isSuccess
            ? "bg-emerald-500/25 text-emerald-200 ring-emerald-400/30"
            : "bg-red-500/25 text-red-200 ring-red-400/30"
        }`}
        aria-hidden
      >
        {isSuccess ? "✓" : "!"}
      </span>
      <span className="min-w-0 font-medium leading-snug">{toast.message}</span>
    </div>,
    document.body
  );
}
