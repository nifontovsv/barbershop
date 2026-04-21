import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default function AdminHomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center px-4 py-12 text-sm text-white/60">
          Загрузка панели…
        </div>
      }
    >
      <AdminDashboard />
    </Suspense>
  );
}
