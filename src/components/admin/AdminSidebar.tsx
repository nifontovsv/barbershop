"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminMiniCalendar } from "@/components/admin/AdminMiniCalendar";
import { apiBase } from "@/lib/basePath";
import { canAccessTab, type EmployeePermissions } from "@/lib/adminPermissions";

export type AdminTabId =
  | "bookings"
  | "slot_blocks"
  | "clients"
  | "content"
  | "employees"
  | "shifts";

type CollapsibleId = "employees" | "shifts";

type NavEntry =
  | { kind: "link"; id: AdminTabId; label: string }
  | { kind: "collapsible"; id: CollapsibleId; label: string };

/** Порядок пунктов меню */
const NAV_ORDER: readonly NavEntry[] = [
  { kind: "link", id: "bookings", label: "Журнал" },
  { kind: "link", id: "slot_blocks", label: "Блокировка слотов" },
  { kind: "collapsible", id: "shifts", label: "График" },
  { kind: "collapsible", id: "employees", label: "Сотрудники" },
  { kind: "link", id: "clients", label: "База клиентов" },
  { kind: "link", id: "content", label: "Контент" },
] as const;

function visibleNavOrder(
  isEnvAdmin: boolean,
  permissions: EmployeePermissions
): readonly NavEntry[] {
  return NAV_ORDER.filter((entry) => {
    if (entry.kind === "collapsible" && entry.id === "employees") return isEnvAdmin;
    if (entry.kind === "collapsible" && entry.id === "shifts") {
      return isEnvAdmin || canAccessTab(permissions, "shifts");
    }
    if (entry.kind === "link" && entry.id !== "employees") {
      return isEnvAdmin || canAccessTab(permissions, entry.id);
    }
    return true;
  });
}

function NavIcon({ id }: { id: AdminTabId }) {
  const cls = "h-[18px] w-[18px] shrink-0";
  switch (id) {
    case "bookings":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "slot_blocks":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      );
    case "clients":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="10" r="2.5" />
          <path d="M3 20c0-3 3-5 6-5s6 2 6 5M14 20c0-2 1.5-3.5 3.5-3.5S21 18 21 20" />
        </svg>
      );
    case "content":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "employees":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.5 3.5-6 7-6s7 2.5 7 6" />
        </svg>
      );
    case "shifts":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
  }
}

function PersonAvatar({ name }: { name: string }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-medium text-violet-100">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

interface SidebarPerson {
  id: string;
  name: string;
}

interface AdminSidebarProps {
  tab: AdminTabId;
  onTabChange: (id: AdminTabId) => void;
  selectedDate: string;
  onSelectDate: (ymd: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isEnvAdmin: boolean;
  permissions: EmployeePermissions;
  userLogin: string | null;
  employees: SidebarPerson[];
  masters: SidebarPerson[];
  selectedEmployeeId: string | null;
  selectedShiftMasterId: string | null;
  onSelectEmployee: (id: string) => void;
  onSelectShiftMaster: (id: string) => void;
}

function CollapsibleSection({
  id,
  label,
  activeTab,
  collapsed,
  expanded,
  onHeaderClick,
  children,
}: {
  id: CollapsibleId;
  label: string;
  activeTab: AdminTabId;
  collapsed: boolean;
  expanded: boolean;
  onHeaderClick: () => void;
  children: React.ReactNode;
}) {
  const tabId = id;
  const active = activeTab === tabId;

  if (collapsed) {
    return (
      <button
        type="button"
        title={label}
        onClick={onHeaderClick}
        className={`flex w-full cursor-pointer items-center justify-center rounded-lg px-0 py-2.5 transition ${
          active ? "bg-(--accent)/15 text-(--accent)" : "text-white/75 hover:bg-white/8 hover:text-white"
        }`}
      >
        <NavIcon id={tabId} />
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/15">
      <button
        type="button"
        onClick={onHeaderClick}
        className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold transition ${
          active
            ? "bg-amber-400/20 text-white"
            : "bg-amber-400/12 text-white/90 hover:bg-amber-400/18"
        }`}
      >
        <NavIcon id={tabId} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-in-out ${
            expanded ? "rotate-180" : "rotate-0"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/8 bg-(--surface)/40 py-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

function NavLinkButton({
  id,
  label,
  active,
  collapsed,
  onClick,
}: {
  id: AdminTabId;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm transition ${
        active
          ? "bg-(--accent)/15 font-medium text-(--accent)"
          : "text-white/75 hover:bg-white/8 hover:text-white"
      } ${collapsed ? "justify-center px-0" : ""}`}
    >
      <NavIcon id={id} />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </button>
  );
}

export function AdminSidebar({
  tab,
  onTabChange,
  selectedDate,
  onSelectDate,
  collapsed,
  onToggleCollapsed,
  isEnvAdmin,
  permissions,
  userLogin,
  employees,
  masters,
  selectedEmployeeId,
  selectedShiftMasterId,
  onSelectEmployee,
  onSelectShiftMaster,
}: AdminSidebarProps) {
  const router = useRouter();
  const navOrder = visibleNavOrder(isEnvAdmin, permissions);
  const [expandedSection, setExpandedSection] = useState<CollapsibleId | null>(() =>
    tab === "employees" ? "employees" : tab === "shifts" ? "shifts" : null
  );

  useEffect(() => {
    if (tab !== "employees" && tab !== "shifts") {
      setExpandedSection(null);
    }
  }, [tab]);

  const logout = useCallback(async () => {
    await fetch(`${apiBase}/api/admin/logout`, { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }, [router]);

  const handleDateSelect = (ymd: string) => {
    onSelectDate(ymd);
    onTabChange("bookings");
  };

  const openCollapsible = (id: CollapsibleId) => {
    onTabChange(id);
    if (!collapsed) setExpandedSection(id);
  };

  const handleCollapsibleHeader = (id: CollapsibleId) => {
    if (collapsed) {
      openCollapsible(id);
      return;
    }
    if (tab === id && expandedSection === id) {
      setExpandedSection(null);
      return;
    }
    onTabChange(id);
    setExpandedSection(id);
  };

  const renderCollapsibleChildren = (id: CollapsibleId) => {
    if (id === "employees") {
      if (employees.length === 0) {
        return <p className="px-3 py-2 text-xs text-white/45">Нет сотрудников с доступом</p>;
      }
      return (
        <ul>
          {employees.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => {
                  onSelectEmployee(e.id);
                  onTabChange("employees");
                  setExpandedSection("employees");
                }}
                className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                  tab === "employees" && selectedEmployeeId === e.id
                    ? "bg-(--accent)/15 text-white"
                    : "text-white/75 hover:bg-white/5"
                }`}
              >
                <PersonAvatar name={e.name} />
                <span className="truncate">{e.name}</span>
              </button>
            </li>
          ))}
        </ul>
      );
    }

    if (masters.length === 0) {
      return <p className="px-3 py-2 text-xs text-white/45">Нет мастеров</p>;
    }
    return (
      <ul>
        {masters.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => {
                onSelectShiftMaster(m.id);
                onTabChange("shifts");
                setExpandedSection("shifts");
              }}
              className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                tab === "shifts" && selectedShiftMasterId === m.id
                  ? "bg-(--accent)/15 text-white"
                  : "text-white/75 hover:bg-white/5"
              }`}
            >
              <PersonAvatar name={m.name} />
              <span className="truncate">{m.name}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-white/10 bg-(--surface) transition-[width] duration-200 ${
        collapsed ? "w-18" : "w-68"
      }`}
    >
      <div
        className={`flex h-12 shrink-0 items-center border-b border-white/10 ${
          collapsed ? "justify-center px-0" : "px-2"
        }`}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white"
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        {!collapsed ? (
          <span className="ml-1 truncate text-sm font-semibold text-(--accent)">Barbershop</span>
        ) : null}
      </div>

      {!collapsed ? (
        <div className="border-b border-white/10 py-3">
          <AdminMiniCalendar selectedDate={selectedDate} onSelectDate={handleDateSelect} />
        </div>
      ) : null}

      <nav className="flex-1 space-y-2 overflow-y-auto p-2 scrollbar-theme">
        {navOrder.map((entry) => {
          if (entry.kind === "link") {
            return (
              <NavLinkButton
                key={entry.id}
                id={entry.id}
                label={entry.label}
                active={tab === entry.id}
                collapsed={collapsed}
                onClick={() => onTabChange(entry.id)}
              />
            );
          }

          return (
            <CollapsibleSection
              key={entry.id}
              id={entry.id}
              label={entry.label}
              activeTab={tab}
              collapsed={collapsed}
              expanded={expandedSection === entry.id}
              onHeaderClick={() => handleCollapsibleHeader(entry.id)}
            >
              {renderCollapsibleChildren(entry.id)}
            </CollapsibleSection>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-white/10 p-2">
        {userLogin ? (
          <div
            className={`mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title={collapsed ? userLogin : undefined}
          >
            <PersonAvatar name={userLogin} />
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white/90">{userLogin}</p>
                <p className="truncate text-[10px] text-white/45">
                  {isEnvAdmin ? "Главный администратор" : "Сотрудник"}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        <Link
          href="/"
          title={collapsed ? "На сайт" : undefined}
          className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-white/65 transition hover:bg-white/8 hover:text-white ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
          </svg>
          {!collapsed ? "На сайт" : null}
        </Link>
        <button
          type="button"
          title={collapsed ? "Выйти" : undefined}
          onClick={() => void logout()}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-white/65 transition hover:bg-white/8 hover:text-white ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          {!collapsed ? "Выйти" : null}
        </button>
      </div>
    </aside>
  );
}
