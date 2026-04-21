import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-white/50">
          Загрузка…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
