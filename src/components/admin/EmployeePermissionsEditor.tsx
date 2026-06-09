"use client";

import {
  ADMIN_PERMISSION_TABS,
  clonePermissions,
  type EmployeePermissions,
} from "@/lib/adminPermissions";

const INPUT =
  "mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white";

export function EmployeePermissionsEditor({
  value,
  onChange,
  disabled,
}: {
  value: EmployeePermissions;
  onChange: (next: EmployeePermissions) => void;
  disabled?: boolean;
}) {
  const setTab = (id: (typeof ADMIN_PERMISSION_TABS)[number]["id"], checked: boolean) => {
    const next = clonePermissions(value);
    next.tabs[id] = checked;
    onChange(next);
  };

  const setFlag = (key: keyof Omit<EmployeePermissions, "tabs">, checked: boolean) => {
    onChange({ ...clonePermissions(value), [key]: checked });
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
      <div>
        <p className="text-sm font-medium text-white/85">Разделы админки</p>
        <p className="mt-1 text-xs text-white/45">Отметьте, что сотрудник может видеть в меню</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {ADMIN_PERMISSION_TABS.map((tab) => (
            <label
              key={tab.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
            >
              <input
                type="checkbox"
                disabled={disabled}
                checked={value.tabs[tab.id]}
                onChange={(e) => setTab(tab.id, e.target.checked)}
                className="accent-[var(--accent)]"
              />
              {tab.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-white/85">Ограничения</p>
        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              disabled={disabled || !value.tabs.bookings}
              checked={value.bookingsOwnOnly}
              onChange={(e) => setFlag("bookingsOwnOnly", e.target.checked)}
              className="mt-0.5 accent-[var(--accent)]"
            />
            <span>
              В журнале редактировать только свои записи
              <span className="mt-0.5 block text-xs text-white/45">
                Нужна привязка к профилю мастера на сайте
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              disabled={disabled || !value.tabs.bookings}
              checked={value.hideOthersPhones}
              onChange={(e) => setFlag("hideOthersPhones", e.target.checked)}
              className="mt-0.5 accent-[var(--accent)]"
            />
            <span>
              Скрывать телефоны клиентов в чужих ячейках журнала
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              disabled={disabled || !value.tabs.slot_blocks}
              checked={value.slotBlocksOwnOnly}
              onChange={(e) => setFlag("slotBlocksOwnOnly", e.target.checked)}
              className="mt-0.5 accent-[var(--accent)]"
            />
            <span>Блокировать слоты только для себя</span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              disabled={disabled || !value.tabs.shifts}
              checked={value.shiftsOwnOnly}
              onChange={(e) => setFlag("shiftsOwnOnly", e.target.checked)}
              className="mt-0.5 accent-[var(--accent)]"
            />
            <span>Менять график только свой (чужой — только просмотр)</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export { INPUT };
