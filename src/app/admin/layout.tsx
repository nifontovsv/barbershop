export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">{children}</div>;
}
