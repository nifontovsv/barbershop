/** Вкладки админки, доступ к которым настраивается для сотрудника */
export type AdminPermissionTab = "bookings" | "slot_blocks" | "shifts" | "clients" | "content";

export interface EmployeePermissions {
  tabs: Record<AdminPermissionTab, boolean>;
  /** Только свои записи в журнале */
  bookingsOwnOnly: boolean;
  /** Скрывать телефоны в ячейках других мастеров */
  hideOthersPhones: boolean;
  /** Блокировать слоты только для себя */
  slotBlocksOwnOnly: boolean;
  /** Менять график только свой */
  shiftsOwnOnly: boolean;
}

export const ADMIN_PERMISSION_TABS: readonly {
  id: AdminPermissionTab;
  label: string;
}[] = [
  { id: "bookings", label: "Журнал" },
  { id: "slot_blocks", label: "Блокировка слотов" },
  { id: "shifts", label: "График" },
  { id: "clients", label: "База клиентов" },
  { id: "content", label: "Контент" },
] as const;

export const DEFAULT_EMPLOYEE_PERMISSIONS: EmployeePermissions = {
  tabs: {
    bookings: true,
    slot_blocks: true,
    shifts: true,
    clients: false,
    content: false,
  },
  bookingsOwnOnly: true,
  hideOthersPhones: true,
  slotBlocksOwnOnly: true,
  shiftsOwnOnly: true,
};

/** Все разделы без ограничений «только своё» — для миграции бывших админов-сотрудников */
export const LEGACY_ADMIN_EMPLOYEE_PERMISSIONS: EmployeePermissions = {
  tabs: {
    bookings: true,
    slot_blocks: true,
    shifts: true,
    clients: true,
    content: true,
  },
  bookingsOwnOnly: false,
  hideOthersPhones: false,
  slotBlocksOwnOnly: false,
  shiftsOwnOnly: false,
};

export function clonePermissions(p: EmployeePermissions): EmployeePermissions {
  return {
    tabs: { ...p.tabs },
    bookingsOwnOnly: p.bookingsOwnOnly,
    hideOthersPhones: p.hideOthersPhones,
    slotBlocksOwnOnly: p.slotBlocksOwnOnly,
    shiftsOwnOnly: p.shiftsOwnOnly,
  };
}

export function parseEmployeePermissions(raw: string | null | undefined): EmployeePermissions {
  if (!raw?.trim()) return clonePermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
  try {
    const data = JSON.parse(raw) as Partial<EmployeePermissions>;
    const base = clonePermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
    if (data.tabs && typeof data.tabs === "object") {
      for (const t of ADMIN_PERMISSION_TABS) {
        if (typeof data.tabs[t.id] === "boolean") base.tabs[t.id] = data.tabs[t.id]!;
      }
    }
    if (typeof data.bookingsOwnOnly === "boolean") base.bookingsOwnOnly = data.bookingsOwnOnly;
    if (typeof data.hideOthersPhones === "boolean") base.hideOthersPhones = data.hideOthersPhones;
    if (typeof data.slotBlocksOwnOnly === "boolean") base.slotBlocksOwnOnly = data.slotBlocksOwnOnly;
    if (typeof data.shiftsOwnOnly === "boolean") base.shiftsOwnOnly = data.shiftsOwnOnly;
    return base;
  } catch {
    return clonePermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
  }
}

export function serializeEmployeePermissions(p: EmployeePermissions): string {
  return JSON.stringify(p);
}

export function permissionsFromLegacyRole(role: string | undefined): EmployeePermissions {
  return role === "admin"
    ? clonePermissions(LEGACY_ADMIN_EMPLOYEE_PERMISSIONS)
    : clonePermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
}

export function canAccessTab(
  permissions: EmployeePermissions | null | undefined,
  tab: AdminPermissionTab
): boolean {
  if (!permissions) return false;
  return permissions.tabs[tab] === true;
}
