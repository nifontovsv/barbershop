import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "node:crypto";
import { runSchemaMigrations } from "./schemaMigrate";
import { ALL_MASTERS_BLOCK_ID } from "./slotBlockConstants";
import {
  parseSalonHoursJson,
  SALON_HOURS_KV_KEY,
  type SalonHoursConfig,
  validateSalonHours,
} from "./salonHours";
import { hashEmployeePassword } from "./employeePassword";
import { isHourAvailableForMaster, resolveMasterWorkHours, type MasterShiftInfo } from "./masterSchedule";
import type { EmployeePermissions } from "./adminPermissions";
import {
  DEFAULT_EMPLOYEE_PERMISSIONS,
  parseEmployeePermissions,
  serializeEmployeePermissions,
} from "./adminPermissions";
import { BREAK_DURATION_MINUTES, type BreakDurationMinutes } from "./masterBreak";

// График: Пн–Пт 12:00–21:00 (интервал 1 ч), в 22:00 закрыты. Часы — по времени салона (Москва).
export function getSalonHoursConfig(): SalonHoursConfig {
  return parseSalonHoursJson(getSiteKv(SALON_HOURS_KV_KEY));
}

export function setSalonHoursConfig(config: SalonHoursConfig): void {
  const err = validateSalonHours(config);
  if (err) throw new Error(err);
  setSiteKv(SALON_HOURS_KV_KEY, JSON.stringify(config));
}

function salonSlotBounds(): { startHour: number; endHour: number } {
  const { startHour, endHourExclusive } = getSalonHoursConfig();
  return { startHour, endHour: endHourExclusive };
}
const SALON_UTC_OFFSET_HOURS = 3; // Europe/Moscow

const dbDir = path.join(process.cwd(), "data");
const dbPath = process.env.DATABASE_PATH || path.join(dbDir, "barbershop.db");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    durationMinutes INTEGER NOT NULL,
    price INTEGER,
    sortOrder INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS masters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    rating REAL NOT NULL,
    phone TEXT,
    telegramChatId TEXT,
    pushToken TEXT
  );
  CREATE TABLE IF NOT EXISTS master_services (
    masterId TEXT NOT NULL,
    serviceId TEXT NOT NULL,
    PRIMARY KEY (masterId, serviceId),
    FOREIGN KEY (masterId) REFERENCES masters(id),
    FOREIGN KEY (serviceId) REFERENCES services(id)
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    masterId TEXT NOT NULL,
    masterName TEXT NOT NULL,
    serviceId TEXT NOT NULL,
    serviceName TEXT NOT NULL,
    clientName TEXT NOT NULL,
    clientPhone TEXT NOT NULL,
    slotStart TEXT NOT NULL,
    slotEnd TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    comment TEXT,
    masterComment TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (masterId) REFERENCES masters(id),
    FOREIGN KEY (serviceId) REFERENCES services(id)
  );
  CREATE INDEX IF NOT EXISTS idx_bookings_master_slot ON bookings(masterId, slotStart);
`);

// Seed services
const serviceCount = db.prepare("SELECT COUNT(*) as n FROM services").get() as { n: number };
if (serviceCount.n === 0) {
  const insertService = db.prepare(
    "INSERT INTO services (id, name, durationMinutes, price, sortOrder) VALUES (?, ?, ?, ?, ?)"
  );
  // Мужская стрижка
  insertService.run("1", "Стрижка", 45, 2500, 1);
  insertService.run("2", "Удлиненная стрижка", 60, 3000, 2);
  insertService.run("3", "Стрижка+моделирование бороды", 60, 3700, 3);
  insertService.run("4", "Стрижка+бритьё лица", 60, 3700, 4);
  insertService.run("5", "Стрижка машинкой", 30, 2000, 5);
  insertService.run("6", "Моделирование бороды", 30, 1700, 6);
  insertService.run("7", "Укладка", 15, 1000, 7);
  // Камуфляж седины
  insertService.run("8", "Камуфляж стрижки", 45, 1600, 8);
  insertService.run("9", "Камуфляж бороды", 30, 1100, 9);
  // Чистое бритьё
  insertService.run("10", "Бритьё головы", 45, 2500, 10);
  insertService.run("11", "Бритьё лица", 30, 2000, 11);
  // Уход
  insertService.run("12", "Воск", 15, 600, 12);
}

// Seed masters
const masterCount = db.prepare("SELECT COUNT(*) as n FROM masters").get() as { n: number };
if (masterCount.n === 0) {
  const insertMaster = db.prepare(
    "INSERT INTO masters (id, name, specialty, rating, phone) VALUES (?, ?, ?, ?, ?)"
  );
  insertMaster.run("1", "Марат", "Мужские стрижки, борода", 5.0, "+79001234567");
  insertMaster.run("2", "Владимир", "Стрижки, бритьё", 5.0, "+79001234568");

  const linkMasterService = db.prepare(
    "INSERT INTO master_services (masterId, serviceId) VALUES (?, ?)"
  );
  for (const masterId of ["1", "2"]) {
    for (let s = 1; s <= 12; s++) {
      linkMasterService.run(masterId, String(s));
    }
  }
}

runSchemaMigrations(db);

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
  sortOrder: number;
  categoryId: string | null;
}

export interface ServiceCategoryRow {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Master {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  phone?: string | null;
  telegramChatId?: string | null;
}

export interface TimeSlot {
  id: string;
  masterId: string;
  start: string;
  end: string;
  available: boolean;
}

export interface Booking {
  id: string;
  masterId: string;
  masterName: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  slotStart: string;
  slotEnd: string;
  status: string;
  /** Комментарий клиента из формы записи */
  comment?: string | null;
  /** Внутренняя заметка мастера / администратора (только админка) */
  masterComment?: string | null;
  createdAt: string;
}

export function getServices(): Service[] {
  const rows = db
    .prepare(
      "SELECT id, name, durationMinutes, price, sortOrder, categoryId FROM services ORDER BY sortOrder, id"
    )
    .all() as Service[];
  return rows.map((r) => ({
    ...r,
    categoryId: r.categoryId ?? null,
  }));
}

export function listServiceCategories(): ServiceCategoryRow[] {
  return db
    .prepare("SELECT id, name, sortOrder FROM service_categories ORDER BY sortOrder, id")
    .all() as ServiceCategoryRow[];
}

export function insertServiceCategory(name: string, sortOrder: number): ServiceCategoryRow {
  const id = `cat-${randomUUID().slice(0, 8)}`;
  db.prepare("INSERT INTO service_categories (id, name, sortOrder) VALUES (?, ?, ?)").run(
    id,
    name.trim(),
    sortOrder
  );
  return db.prepare("SELECT id, name, sortOrder FROM service_categories WHERE id = ?").get(id) as ServiceCategoryRow;
}

export function updateServiceCategory(
  id: string,
  patch: Partial<{ name: string; sortOrder: number }>
): ServiceCategoryRow | null {
  const cur = db
    .prepare("SELECT id, name, sortOrder FROM service_categories WHERE id = ?")
    .get(id) as ServiceCategoryRow | undefined;
  if (!cur) return null;
  const name = patch.name !== undefined ? patch.name.trim() : cur.name;
  const sortOrder = patch.sortOrder !== undefined ? patch.sortOrder : cur.sortOrder;
  db.prepare("UPDATE service_categories SET name = ?, sortOrder = ? WHERE id = ?").run(name, sortOrder, id);
  return db.prepare("SELECT id, name, sortOrder FROM service_categories WHERE id = ?").get(id) as ServiceCategoryRow;
}

export type DeleteCategoryResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "has_services" };

export function deleteServiceCategory(id: string): DeleteCategoryResult {
  const n = db.prepare("SELECT COUNT(*) as n FROM services WHERE categoryId = ?").get(id) as { n: number };
  if (n.n > 0) return { ok: false, reason: "has_services" };
  const r = db.prepare("DELETE FROM service_categories WHERE id = ?").run(id);
  if (r.changes === 0) return { ok: false, reason: "not_found" };
  return { ok: true };
}

function linkServiceToAllMasters(serviceId: string): void {
  const masters = db.prepare("SELECT id FROM masters").all() as { id: string }[];
  const link = db.prepare("INSERT OR IGNORE INTO master_services (masterId, serviceId) VALUES (?, ?)");
  for (const m of masters) link.run(m.id, serviceId);
}

export function insertService(data: {
  name: string;
  durationMinutes: number;
  price: number | null;
  sortOrder: number;
  categoryId: string;
}): Service {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO services (id, name, durationMinutes, price, sortOrder, categoryId) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.name.trim(),
    data.durationMinutes,
    data.price,
    data.sortOrder,
    data.categoryId
  );
  linkServiceToAllMasters(id);
  return db.prepare("SELECT id, name, durationMinutes, price, sortOrder, categoryId FROM services WHERE id = ?").get(
    id
  ) as Service;
}

export function updateService(
  id: string,
  patch: Partial<{
    name: string;
    durationMinutes: number;
    price: number | null;
    sortOrder: number;
    categoryId: string | null;
  }>
): Service | null {
  const cur = db
    .prepare("SELECT id, name, durationMinutes, price, sortOrder, categoryId FROM services WHERE id = ?")
    .get(id) as Service | undefined;
  if (!cur) return null;
  const name = patch.name !== undefined ? patch.name.trim() : cur.name;
  const durationMinutes = patch.durationMinutes ?? cur.durationMinutes;
  const price = patch.price !== undefined ? patch.price : cur.price;
  const sortOrder = patch.sortOrder ?? cur.sortOrder;
  const categoryId = patch.categoryId !== undefined ? patch.categoryId : cur.categoryId;
  db.prepare(
    `UPDATE services SET name = ?, durationMinutes = ?, price = ?, sortOrder = ?, categoryId = ? WHERE id = ?`
  ).run(name, durationMinutes, price, sortOrder, categoryId, id);
  return db.prepare("SELECT id, name, durationMinutes, price, sortOrder, categoryId FROM services WHERE id = ?").get(
    id
  ) as Service;
}

export type DeleteServiceResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "has_bookings" };

export function deleteService(id: string): DeleteServiceResult {
  const bookingCount = db.prepare("SELECT COUNT(*) as n FROM bookings WHERE serviceId = ?").get(id) as {
    n: number;
  };
  if (bookingCount.n > 0) return { ok: false, reason: "has_bookings" };
  const run = db.transaction(() => {
    db.prepare("DELETE FROM master_services WHERE serviceId = ?").run(id);
    db.prepare("DELETE FROM services WHERE id = ?").run(id);
  });
  const before = db.prepare("SELECT 1 FROM services WHERE id = ?").get(id);
  if (!before) return { ok: false, reason: "not_found" };
  run();
  return { ok: true };
}

export function getMasters(serviceId?: string): Master[] {
  let query =
    "SELECT id, name, specialty, rating, phone, telegramChatId FROM masters";
  const params: string[] = [];
  if (serviceId) {
    query +=
      " WHERE id IN (SELECT masterId FROM master_services WHERE serviceId = ?)";
    params.push(serviceId);
  }
  query += " ORDER BY rating DESC";
  const stmt = params.length ? db.prepare(query).bind(...params) : db.prepare(query);
  const rows = stmt.all() as (Master & { telegramChatId?: string | null })[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    rating: row.rating,
    phone: row.phone,
  }));
}

export function getMasterById(id: string): (Master & { pushToken?: string | null }) | null {
  const row = db
    .prepare(
      "SELECT id, name, specialty, rating, phone, telegramChatId, pushToken FROM masters WHERE id = ?"
    )
    .get(id) as (Master & { pushToken?: string | null }) | undefined;
  return row ?? null;
}

function parseSlotId(
  slotId: string
): { masterId: string; slotStart: string; slotEnd: string; blockDate: string; hour: number } | null {
  const match = slotId.match(/^(.+)-(\d{4}-\d{2}-\d{2})-(\d{2})$/);
  if (!match) return null;
  const masterId = match[1];
  const blockDate = match[2];
  const hour = parseInt(match[3], 10);
  const { startHour, endHour } = salonSlotBounds();
  if (isNaN(hour) || hour < startHour || hour >= endHour) return null;
  const [y, m, d] = blockDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const start = new Date(Date.UTC(y, m - 1, d, hour - SALON_UTC_OFFSET_HOURS, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, hour + 1 - SALON_UTC_OFFSET_HOURS, 0, 0, 0));
  if (isNaN(start.getTime())) return null;
  return {
    masterId,
    slotStart: start.toISOString(),
    slotEnd: end.toISOString(),
    blockDate,
    hour,
  };
}

function isSlotBlocked(masterId: string, blockDate: string, hour: number): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM slot_blocks WHERE blockDate = ? AND hour = ?
       AND (masterId = ? OR masterId = ?) LIMIT 1`
    )
    .get(blockDate, hour, ALL_MASTERS_BLOCK_ID, masterId);
  return Boolean(row);
}

export interface MasterShiftRow {
  id: string;
  masterId: string;
  workDate: string;
  startHour: number;
  endHourExclusive: number;
  isDayOff: number;
  createdAt: string;
}

/** Часы работы мастера на дату: null = правила салона по умолчанию */
export function getMasterShiftForDate(
  masterId: string,
  workDate: string
): MasterShiftRow | null {
  const row = db
    .prepare(
      `SELECT id, masterId, workDate, startHour, endHourExclusive, isDayOff, createdAt
       FROM master_shifts WHERE masterId = ? AND workDate = ?`
    )
    .get(masterId, workDate) as MasterShiftRow | undefined;
  return row ?? null;
}

export function listMasterShifts(
  masterId: string,
  dateFrom: string,
  dateTo: string
): MasterShiftRow[] {
  return db
    .prepare(
      `SELECT id, masterId, workDate, startHour, endHourExclusive, isDayOff, createdAt
       FROM master_shifts WHERE masterId = ? AND workDate >= ? AND workDate <= ?
       ORDER BY workDate`
    )
    .all(masterId, dateFrom, dateTo) as MasterShiftRow[];
}

export function listMasterShiftsForDate(workDate: string): MasterShiftRow[] {
  return db
    .prepare(
      `SELECT id, masterId, workDate, startHour, endHourExclusive, isDayOff, createdAt
       FROM master_shifts WHERE workDate = ?
       ORDER BY masterId`
    )
    .all(workDate) as MasterShiftRow[];
}

function masterShiftInfo(masterId: string, workDate: string): MasterShiftInfo | null {
  const shift = getMasterShiftForDate(masterId, workDate);
  if (!shift) return null;
  return {
    startHour: shift.startHour,
    endHourExclusive: shift.endHourExclusive,
    isDayOff: shift.isDayOff === 1,
  };
}

function isHourAllowedForMaster(masterId: string, blockDate: string, hour: number): boolean {
  return isHourAvailableForMaster(
    hour,
    getSalonHoursConfig(),
    blockDate,
    masterShiftInfo(masterId, blockDate)
  );
}

export function upsertMasterShift(input: {
  masterId: string;
  workDate: string;
  startHour: number;
  endHourExclusive: number;
  isDayOff: boolean;
}): MasterShiftRow {
  const existing = getMasterShiftForDate(input.masterId, input.workDate);
  const isDayOff = input.isDayOff ? 1 : 0;
  if (existing) {
    db.prepare(
      `UPDATE master_shifts SET startHour = ?, endHourExclusive = ?, isDayOff = ? WHERE id = ?`
    ).run(input.startHour, input.endHourExclusive, isDayOff, existing.id);
    return getMasterShiftForDate(input.masterId, input.workDate)!;
  }
  const id = "ms-" + randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO master_shifts (id, masterId, workDate, startHour, endHourExclusive, isDayOff, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.masterId,
    input.workDate,
    input.startHour,
    input.endHourExclusive,
    isDayOff,
    createdAt
  );
  return getMasterShiftForDate(input.masterId, input.workDate)!;
}

export function deleteMasterShift(masterId: string, workDate: string): boolean {
  const r = db
    .prepare("DELETE FROM master_shifts WHERE masterId = ? AND workDate = ?")
    .run(masterId, workDate);
  return r.changes > 0;
}

function resolveWorkHours(
  masterId: string,
  dateStr: string,
  _y: number,
  _m: number,
  _d: number
): { startHour: number; endHour: number } | null {
  const hours = resolveMasterWorkHours(getSalonHoursConfig(), dateStr, masterShiftInfo(masterId, dateStr));
  if (!hours) return null;
  return { startHour: hours.startHour, endHour: hours.endHourExclusive };
}

function timeRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const a0 = new Date(startA).getTime();
  const a1 = new Date(endA).getTime();
  const b0 = new Date(startB).getTime();
  const b1 = new Date(endB).getTime();
  return a0 < b1 && a1 > b0;
}

function masterHasBreakOverlap(
  masterId: string,
  slotStart: string,
  slotEnd: string,
  excludeBreakId?: string
): boolean {
  const rows = db
    .prepare(
      `SELECT id, slotStart, slotEnd FROM master_breaks
       WHERE masterId = ? AND slotStart < ? AND slotEnd > ?`
    )
    .all(masterId, slotEnd, slotStart) as { id: string; slotStart: string; slotEnd: string }[];
  return rows.some((r) => r.id !== excludeBreakId);
}

function masterHasBookingOverlap(
  masterId: string,
  slotStart: string,
  slotEnd: string,
  excludeBookingId?: string
): boolean {
  const rows = db
    .prepare(
      `SELECT id, slotStart, slotEnd FROM bookings
       WHERE masterId = ? AND status != ? AND slotStart < ? AND slotEnd > ?`
    )
    .all(masterId, "cancelled", slotEnd, slotStart) as { id: string }[];
  return rows.some((r) => r.id !== excludeBookingId);
}

export function getSlots(masterId: string, dateStr: string): TimeSlot[] | null {
  const master = getMasterById(masterId);
  if (!master) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const hours = resolveWorkHours(masterId, dateStr, y, m, d);
  if (!hours) return [];
  const slots: TimeSlot[] = [];
  const dateOnly = dateStr;
  for (let h = hours.startHour; h < hours.endHour; h++) {
    const start = new Date(Date.UTC(y, m - 1, d, h - SALON_UTC_OFFSET_HOURS, 0, 0, 0));
    const end = new Date(Date.UTC(y, m - 1, d, h + 1 - SALON_UTC_OFFSET_HOURS, 0, 0, 0));
    const slotId = `${masterId}-${dateOnly}-${String(h).padStart(2, "0")}`;
    const slotStart = start.toISOString();
    const slotEnd = end.toISOString();
    const occupied = db
      .prepare(
        "SELECT 1 FROM bookings WHERE masterId = ? AND slotStart = ? AND status != ?"
      )
      .get(masterId, slotStart, "cancelled");
    const blocked = isSlotBlocked(masterId, dateOnly, h);
    const breakBusy = masterHasBreakOverlap(masterId, slotStart, slotEnd);
    slots.push({
      id: slotId,
      masterId,
      start: slotStart,
      end: slotEnd,
      available: !occupied && !blocked && !breakBusy,
    });
  }
  return slots;
}

function normalizeStoredEmail(email?: string | null): string | null {
  if (email === undefined || email === null) return null;
  const trimmed = email.trim();
  return trimmed === "" ? null : trimmed.toLowerCase();
}

export function createBooking(
  masterId: string,
  serviceId: string,
  slotId: string,
  clientName: string,
  clientPhone: string,
  comment?: string,
  clientEmail?: string | null
): Booking | null {
  const master = getMasterById(masterId);
  if (!master) return null;
  const serviceRow = db.prepare("SELECT id, name FROM services WHERE id = ?").get(serviceId) as
    | { id: string; name: string }
    | undefined;
  if (!serviceRow) return null;
  const parsed = parseSlotId(slotId);
  if (!parsed || parsed.masterId !== masterId) return null;
  const { slotStart, slotEnd, blockDate, hour } = parsed;

  if (!isHourAllowedForMaster(masterId, blockDate, hour)) return null;
  if (isSlotBlocked(masterId, blockDate, hour)) return null;

  const occupied = db
    .prepare(
      "SELECT 1 FROM bookings WHERE masterId = ? AND slotStart = ? AND status != ?"
    )
    .get(masterId, slotStart, "cancelled");
  if (occupied) return null;

  const id = "b-" + Date.now();
  const createdAt = new Date().toISOString();
  const email = normalizeStoredEmail(clientEmail);
  db.prepare(
    `INSERT INTO bookings (id, masterId, masterName, serviceId, serviceName, clientName, clientPhone, clientEmail, slotStart, slotEnd, status, comment, masterComment, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
  ).run(
    id,
    masterId,
    master.name,
    serviceId,
    serviceRow.name,
    clientName,
    clientPhone,
    email,
    slotStart,
    slotEnd,
    comment ?? null,
    null,
    createdAt
  );
  return {
    id,
    masterId,
    masterName: master.name,
    serviceId,
    serviceName: serviceRow.name,
    clientName,
    clientPhone,
    clientEmail: email,
    slotStart,
    slotEnd,
    status: "pending",
    comment: comment ?? null,
    masterComment: null,
    createdAt,
  };
}

export interface SlotBlockRow {
  id: string;
  masterId: string;
  blockDate: string;
  hour: number;
  note: string | null;
  createdAt: string;
}

export function listSlotBlocks(fromDate?: string, toDate?: string): SlotBlockRow[] {
  if (fromDate && toDate) {
    return db
      .prepare(
        "SELECT id, masterId, blockDate, hour, note, createdAt FROM slot_blocks WHERE blockDate >= ? AND blockDate <= ? ORDER BY blockDate, hour, masterId"
      )
      .all(fromDate, toDate) as SlotBlockRow[];
  }
  return db
    .prepare(
      "SELECT id, masterId, blockDate, hour, note, createdAt FROM slot_blocks ORDER BY blockDate DESC, hour, masterId LIMIT 500"
    )
    .all() as SlotBlockRow[];
}

export function addSlotBlock(
  masterId: string | typeof ALL_MASTERS_BLOCK_ID,
  blockDate: string,
  hour: number,
  note?: string | null
): SlotBlockRow | null {
  const { startHour, endHour } = salonSlotBounds();
  if (hour < startHour || hour >= endHour) return null;
  const id = "sb-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const createdAt = new Date().toISOString();
  try {
    db.prepare(
      `INSERT INTO slot_blocks (id, masterId, blockDate, hour, note, createdAt) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, masterId, blockDate, hour, note ?? null, createdAt);
  } catch {
    return null;
  }
  return db.prepare("SELECT id, masterId, blockDate, hour, note, createdAt FROM slot_blocks WHERE id = ?").get(id) as SlotBlockRow;
}

export function getSlotBlockById(id: string): SlotBlockRow | null {
  const row = db
    .prepare("SELECT id, masterId, blockDate, hour, note, createdAt FROM slot_blocks WHERE id = ?")
    .get(id) as SlotBlockRow | undefined;
  return row ?? null;
}

export function patchSlotBlock(id: string, patch: { note?: string | null }): SlotBlockRow | null {
  const cur = getSlotBlockById(id);
  if (!cur) return null;

  const nextNote =
    patch.note !== undefined
      ? patch.note === null || patch.note.trim() === ""
        ? null
        : patch.note.trim()
      : cur.note;

  db.prepare("UPDATE slot_blocks SET note = ? WHERE id = ?").run(nextNote, id);
  return db
    .prepare("SELECT id, masterId, blockDate, hour, note, createdAt FROM slot_blocks WHERE id = ?")
    .get(id) as SlotBlockRow;
}

export function deleteSlotBlock(id: string): boolean {
  const r = db.prepare("DELETE FROM slot_blocks WHERE id = ?").run(id);
  return r.changes > 0;
}

/** Удаляет несколько блокировок; возвращает число удалённых строк */
export function deleteSlotBlocks(ids: string[]): number {
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => "?").join(",");
  const r = db.prepare(`DELETE FROM slot_blocks WHERE id IN (${placeholders})`).run(...ids);
  return r.changes;
}

export interface MasterBreakRow {
  id: string;
  masterId: string;
  masterName: string;
  workDate: string;
  slotStart: string;
  slotEnd: string;
  durationMinutes: number;
  comment: string | null;
  createdAt: string;
}

const MASTER_BREAK_SELECT = `mb.id, mb.masterId, m.name AS masterName, mb.workDate,
  mb.slotStart, mb.slotEnd, mb.durationMinutes, mb.comment, mb.createdAt`;

export function listMasterBreaks(limit = 500): MasterBreakRow[] {
  return db
    .prepare(
      `SELECT ${MASTER_BREAK_SELECT}
       FROM master_breaks mb
       JOIN masters m ON m.id = mb.masterId
       ORDER BY datetime(mb.slotStart) DESC LIMIT ?`
    )
    .all(limit) as MasterBreakRow[];
}

export function getMasterBreakById(id: string): MasterBreakRow | null {
  const row = db
    .prepare(
      `SELECT ${MASTER_BREAK_SELECT}
       FROM master_breaks mb
       JOIN masters m ON m.id = mb.masterId
       WHERE mb.id = ?`
    )
    .get(id) as MasterBreakRow | undefined;
  return row ?? null;
}

function validateMasterBreakWindow(
  masterId: string,
  workDate: string,
  slotStart: string,
  slotEnd: string,
  excludeBreakId?: string
): boolean {
  const startMin = isoToLocalMinutes(slotStart);
  const endMin = isoToLocalMinutes(slotEnd);
  if (endMin <= startMin) return false;

  const { startHour: salonStart, endHour: salonEnd } = salonSlotBounds();
  for (let h = Math.floor(startMin / 60); h < Math.ceil(endMin / 60); h++) {
    if (h < salonStart || h >= salonEnd) return false;
    if (!isHourAllowedForMaster(masterId, workDate, h)) return false;
    if (isSlotBlocked(masterId, workDate, h)) return false;
  }

  if (masterHasBreakOverlap(masterId, slotStart, slotEnd, excludeBreakId)) return false;
  return true;
}

export function createMasterBreak(input: {
  masterId: string;
  workDate: string;
  startTime: string;
  durationMinutes: number;
  comment?: string | null;
}): MasterBreakRow | null {
  if (!getMasterById(input.masterId)) return null;
  if (!BREAK_DURATION_MINUTES.includes(input.durationMinutes as BreakDurationMinutes)) return null;

  const slotStart = buildSlotIso(input.workDate, input.startTime);
  if (!slotStart) return null;
  const slotEnd = new Date(
    new Date(slotStart).getTime() + input.durationMinutes * 60_000
  ).toISOString();

  if (!validateMasterBreakWindow(input.masterId, input.workDate, slotStart, slotEnd)) return null;

  const id = "brk-" + Date.now();
  const createdAt = new Date().toISOString();
  const comment =
    input.comment === null || input.comment === undefined
      ? null
      : input.comment.trim() === ""
        ? null
        : input.comment.trim();

  db.prepare(
    `INSERT INTO master_breaks (id, masterId, workDate, slotStart, slotEnd, durationMinutes, comment, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.masterId,
    input.workDate,
    slotStart,
    slotEnd,
    input.durationMinutes,
    comment,
    createdAt
  );

  return getMasterBreakById(id);
}

export function patchMasterBreak(
  id: string,
  patch: {
    masterId?: string;
    workDate?: string;
    startTime?: string;
    durationMinutes?: number;
    comment?: string | null;
  }
): MasterBreakRow | null {
  const cur = getMasterBreakById(id);
  if (!cur) return null;

  const masterId = patch.masterId ?? cur.masterId;
  const workDate = patch.workDate ?? cur.workDate;
  const startTime = patch.startTime ?? isoToTimeInputValue(cur.slotStart);
  const durationMinutes = patch.durationMinutes ?? cur.durationMinutes;

  if (!BREAK_DURATION_MINUTES.includes(durationMinutes as BreakDurationMinutes)) return null;

  const slotStart = buildSlotIso(workDate, startTime);
  if (!slotStart) return null;
  const slotEnd = new Date(new Date(slotStart).getTime() + durationMinutes * 60_000).toISOString();

  if (!validateMasterBreakWindow(masterId, workDate, slotStart, slotEnd, id)) return null;

  const comment =
    patch.comment !== undefined
      ? patch.comment === null || patch.comment.trim() === ""
        ? null
        : patch.comment.trim()
      : cur.comment;

  db.prepare(
    `UPDATE master_breaks SET masterId = ?, workDate = ?, slotStart = ?, slotEnd = ?,
     durationMinutes = ?, comment = ? WHERE id = ?`
  ).run(masterId, workDate, slotStart, slotEnd, durationMinutes, comment, id);

  return getMasterBreakById(id);
}

export function deleteMasterBreak(id: string): boolean {
  const r = db.prepare("DELETE FROM master_breaks WHERE id = ?").run(id);
  return r.changes > 0;
}

const BOOKING_SELECT_FIELDS = `id, masterId, masterName, serviceId, serviceName, clientName, clientPhone, clientEmail, slotStart, slotEnd, status, comment, masterComment, createdAt`;

export function listBookings(limit = 200): Booking[] {
  return db
    .prepare(
      `SELECT ${BOOKING_SELECT_FIELDS}
       FROM bookings ORDER BY datetime(slotStart) DESC LIMIT ?`
    )
    .all(limit) as Booking[];
}

const bookingSelect = `SELECT ${BOOKING_SELECT_FIELDS} FROM bookings WHERE id = ?`;

export function getBookingById(id: string): Booking | null {
  const row = db.prepare(bookingSelect).get(id) as Booking | undefined;
  return row ?? null;
}

export function patchBooking(
  id: string,
  patch: {
    status?: string;
    masterComment?: string | null;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string | null;
    comment?: string | null;
    serviceId?: string;
    masterId?: string;
    slotStart?: string;
    slotEnd?: string;
  }
): Booking | null {
  const cur = db.prepare(bookingSelect).get(id) as Booking | undefined;
  if (!cur) return null;

  const nextMasterId = patch.masterId !== undefined ? patch.masterId : cur.masterId;
  const nextServiceId = patch.serviceId !== undefined ? patch.serviceId : cur.serviceId;
  const nextSlotStart = patch.slotStart !== undefined ? patch.slotStart : cur.slotStart;
  const nextSlotEnd = patch.slotEnd !== undefined ? patch.slotEnd : cur.slotEnd;
  const nextStatus = patch.status !== undefined ? patch.status : cur.status;
  const nextMasterComment =
    patch.masterComment !== undefined ? patch.masterComment : cur.masterComment ?? null;
  const nextClientName = patch.clientName !== undefined ? patch.clientName.trim() : cur.clientName;
  const nextClientPhone = patch.clientPhone !== undefined ? patch.clientPhone.trim() : cur.clientPhone;
  const nextClientEmail =
    patch.clientEmail !== undefined ? normalizeStoredEmail(patch.clientEmail) : cur.clientEmail ?? null;
  const nextComment =
    patch.comment !== undefined
      ? patch.comment === null || patch.comment.trim() === ""
        ? null
        : patch.comment.trim()
      : cur.comment ?? null;

  if (!nextClientName || !nextClientPhone) return null;

  const master = getMasterById(nextMasterId);
  if (!master) return null;

  const serviceRow = db.prepare("SELECT id, name FROM services WHERE id = ?").get(nextServiceId) as
    | { id: string; name: string }
    | undefined;
  if (!serviceRow) return null;

  if (new Date(nextSlotEnd).getTime() <= new Date(nextSlotStart).getTime()) return null;

  const blockDate = slotStartLocalYmd(nextSlotStart);
  const startMin = isoToLocalMinutes(nextSlotStart);
  const endMin = isoToLocalMinutes(nextSlotEnd);
  for (let h = Math.floor(startMin / 60); h < Math.ceil(endMin / 60); h++) {
    const { startHour: slotStart, endHour: slotEnd } = salonSlotBounds();
    if (h < slotStart || h >= slotEnd) return null;
    if (!isHourAllowedForMaster(nextMasterId, blockDate, h)) return null;
    if (isSlotBlocked(nextMasterId, blockDate, h)) return null;
  }

  const conflict = db
    .prepare(
      "SELECT 1 FROM bookings WHERE masterId = ? AND slotStart = ? AND status != ? AND id != ? LIMIT 1"
    )
    .get(nextMasterId, nextSlotStart, "cancelled", id);
  if (conflict) return null;

  db.prepare(
    `UPDATE bookings SET masterId = ?, masterName = ?, serviceId = ?, serviceName = ?,
     clientName = ?, clientPhone = ?, clientEmail = ?, slotStart = ?, slotEnd = ?, status = ?, comment = ?, masterComment = ?
     WHERE id = ?`
  ).run(
    nextMasterId,
    master.name,
    nextServiceId,
    serviceRow.name,
    nextClientName,
    nextClientPhone,
    nextClientEmail,
    nextSlotStart,
    nextSlotEnd,
    nextStatus,
    nextComment,
    nextMasterComment,
    id
  );
  return (db.prepare(bookingSelect).get(id) as Booking | undefined) ?? null;
}

function isoToTimeInputValue(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function buildSlotIso(workDate: string, time: string): string | null {
  const [y, m, d] = workDate.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const dt = new Date(Date.UTC(y, m - 1, d, hh - SALON_UTC_OFFSET_HOURS, mm, 0, 0));
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

export function adminCreateBooking(input: {
  masterId: string;
  serviceId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  comment?: string | null;
  masterComment?: string | null;
  status?: string;
}): Booking | null {
  const slotStart = buildSlotIso(input.workDate, input.startTime);
  const slotEnd = buildSlotIso(input.workDate, input.endTime);
  if (!slotStart || !slotEnd) return null;

  const clientName = input.clientName.trim();
  const clientPhone = input.clientPhone.trim();
  if (!clientName || !clientPhone) return null;

  const master = getMasterById(input.masterId);
  if (!master) return null;

  const serviceRow = db.prepare("SELECT id, name FROM services WHERE id = ?").get(input.serviceId) as
    | { id: string; name: string }
    | undefined;
  if (!serviceRow) return null;

  if (new Date(slotEnd).getTime() <= new Date(slotStart).getTime()) return null;

  const blockDate = slotStartLocalYmd(slotStart);
  const startMin = isoToLocalMinutes(slotStart);
  const endMin = isoToLocalMinutes(slotEnd);
  for (let h = Math.floor(startMin / 60); h < Math.ceil(endMin / 60); h++) {
    const { startHour: slotStart, endHour: slotEnd } = salonSlotBounds();
    if (h < slotStart || h >= slotEnd) return null;
    if (!isHourAllowedForMaster(input.masterId, blockDate, h)) return null;
    if (isSlotBlocked(input.masterId, blockDate, h)) return null;
  }

  const conflict = db
    .prepare(
      "SELECT 1 FROM bookings WHERE masterId = ? AND slotStart = ? AND status != ? LIMIT 1"
    )
    .get(input.masterId, slotStart, "cancelled");
  if (conflict) return null;

  const id = "b-" + Date.now();
  const createdAt = new Date().toISOString();
  const status = input.status?.trim() || "pending";
  const comment =
    input.comment === null || input.comment === undefined
      ? null
      : input.comment.trim() === ""
        ? null
        : input.comment.trim();
  const masterComment =
    input.masterComment === null || input.masterComment === undefined
      ? null
      : input.masterComment.trim() === ""
        ? null
        : input.masterComment.trim();

  const clientEmail = normalizeStoredEmail(input.clientEmail);

  db.prepare(
    `INSERT INTO bookings (id, masterId, masterName, serviceId, serviceName, clientName, clientPhone, clientEmail, slotStart, slotEnd, status, comment, masterComment, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.masterId,
    master.name,
    input.serviceId,
    serviceRow.name,
    clientName,
    clientPhone,
    clientEmail,
    slotStart,
    slotEnd,
    status,
    comment,
    masterComment,
    createdAt
  );
  return getBookingById(id);
}

function slotStartLocalYmd(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoToLocalMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function updateBookingStatus(id: string, status: string): Booking | null {
  return patchBooking(id, { status });
}

export function deleteBooking(id: string): boolean {
  const r = db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
  return r.changes > 0;
}

export interface ClientAggregate {
  clientPhone: string;
  displayName: string;
  clientEmail: string | null;
  visitCount: number;
  firstSlotStart: string;
  lastSlotStart: string;
  lastVisitStatus: string;
}

export interface ClientAggregateFilters {
  search?: string;
  status?: "all" | "done" | "cancelled" | "planned";
  visitsMin?: number;
}

export function getClientAggregates(filters?: ClientAggregateFilters): ClientAggregate[] {
  const rows = db
    .prepare(
      `SELECT
         b.clientPhone AS clientPhone,
         (SELECT b2.clientName FROM bookings b2 WHERE b2.clientPhone = b.clientPhone ORDER BY datetime(b2.createdAt) DESC, b2.id DESC LIMIT 1) AS displayName,
         (SELECT b2.clientEmail FROM bookings b2 WHERE b2.clientPhone = b.clientPhone AND b2.clientEmail IS NOT NULL AND b2.clientEmail != '' ORDER BY datetime(b2.createdAt) DESC, b2.id DESC LIMIT 1) AS clientEmail,
         SUM(CASE WHEN b.status != 'cancelled' THEN 1 ELSE 0 END) AS visitCount,
         MIN(datetime(b.slotStart)) AS firstSlotStart,
         MAX(datetime(b.slotStart)) AS lastSlotStart,
         (SELECT b3.status FROM bookings b3 WHERE b3.clientPhone = b.clientPhone ORDER BY datetime(b3.slotStart) DESC, b3.id DESC LIMIT 1) AS lastVisitStatus
       FROM bookings b
       GROUP BY b.clientPhone
       ORDER BY lastSlotStart DESC`
    )
    .all() as ClientAggregate[];

  let out = rows;
  const q = filters?.search?.trim().toLowerCase();
  if (q) {
    const digits = q.replace(/\D/g, "");
    out = out.filter((r) => {
      if (r.displayName.toLowerCase().includes(q)) return true;
      if (r.clientEmail?.toLowerCase().includes(q)) return true;
      if (digits && r.clientPhone.replace(/\D/g, "").includes(digits)) return true;
      return r.clientPhone.toLowerCase().includes(q);
    });
  }
  if (filters?.status && filters.status !== "all") {
    out = out.filter((r) => {
      if (filters.status === "done") return r.lastVisitStatus === "done";
      if (filters.status === "cancelled") return r.lastVisitStatus === "cancelled";
      if (filters.status === "planned") {
        return r.lastVisitStatus === "pending" || r.lastVisitStatus === "confirmed";
      }
      return true;
    });
  }
  if (filters?.visitsMin !== undefined && filters.visitsMin > 0) {
    out = out.filter((r) => r.visitCount >= filters.visitsMin!);
  }
  return out;
}

export function getClientEmailsByPhones(phones: string[]): Map<string, string> {
  const map = new Map<string, string>();
  if (phones.length === 0) return map;
  const all = getClientAggregates();
  const set = new Set(phones);
  for (const row of all) {
    if (set.has(row.clientPhone) && row.clientEmail) {
      map.set(row.clientPhone, row.clientEmail);
    }
  }
  return map;
}

export function getSiteKv(key: string): string | null {
  const row = db.prepare("SELECT value FROM site_kv WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSiteKv(key: string, value: string): void {
  db.prepare("INSERT INTO site_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
    key,
    value
  );
}

export function getAllSiteKv(): Record<string, string> {
  const rows = db.prepare("SELECT key, value FROM site_kv").all() as { key: string; value: string }[];
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export interface MediaItemRow {
  id: string;
  kind: string;
  path: string;
  sortOrder: number;
  alt: string | null;
  createdAt: string;
}

export function listMediaByKind(kind: string): MediaItemRow[] {
  return db
    .prepare(
      "SELECT id, kind, path, sortOrder, alt, createdAt FROM media_items WHERE kind = ? ORDER BY sortOrder, id"
    )
    .all(kind) as MediaItemRow[];
}

export function listAllMediaKinds(): string[] {
  const rows = db.prepare("SELECT DISTINCT kind FROM media_items ORDER BY kind").all() as { kind: string }[];
  return rows.map((r) => r.kind);
}

export function insertMediaItem(
  kind: string,
  path: string,
  sortOrder: number,
  alt?: string | null
): MediaItemRow {
  const id = "m-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO media_items (id, kind, path, sortOrder, alt, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, kind, path, sortOrder, alt ?? null, createdAt);
  return db.prepare("SELECT id, kind, path, sortOrder, alt, createdAt FROM media_items WHERE id = ?").get(id) as MediaItemRow;
}

export function updateMediaItem(
  id: string,
  patch: Partial<Pick<MediaItemRow, "path" | "sortOrder" | "alt">>
): MediaItemRow | null {
  const row = db.prepare("SELECT id FROM media_items WHERE id = ?").get(id);
  if (!row) return null;
  const cur = db.prepare("SELECT path, sortOrder, alt FROM media_items WHERE id = ?").get(id) as {
    path: string;
    sortOrder: number;
    alt: string | null;
  };
  const path = patch.path ?? cur.path;
  const sortOrder = patch.sortOrder ?? cur.sortOrder;
  const alt = patch.alt !== undefined ? patch.alt : cur.alt;
  db.prepare("UPDATE media_items SET path = ?, sortOrder = ?, alt = ? WHERE id = ?").run(path, sortOrder, alt, id);
  return db.prepare("SELECT id, kind, path, sortOrder, alt, createdAt FROM media_items WHERE id = ?").get(id) as MediaItemRow;
}

export function deleteMediaItem(id: string): boolean {
  return db.prepare("DELETE FROM media_items WHERE id = ?").run(id).changes > 0;
}

export interface MasterLandingRow {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  phone: string | null;
  bio: string | null;
  badges: string[];
  sortOrder: number;
  photoPath: string | null;
  visibleOnLanding: number;
}

function parseBadgesJson(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function listMastersForLanding(): MasterLandingRow[] {
  const rows = db
    .prepare(
      `SELECT id, name, specialty, rating, phone, bio, badges, sortOrder, photoPath, visibleOnLanding
       FROM masters WHERE visibleOnLanding = 1 ORDER BY sortOrder ASC, id`
    )
    .all() as (Omit<MasterLandingRow, "badges"> & { badges: string | null })[];
  return rows.map((r) => ({
    ...r,
    badges: parseBadgesJson(r.badges),
  }));
}

export function listMastersAdmin(): MasterLandingRow[] {
  const rows = db
    .prepare(
      `SELECT id, name, specialty, rating, phone, bio, badges, sortOrder, photoPath, visibleOnLanding
       FROM masters ORDER BY sortOrder ASC, id`
    )
    .all() as (Omit<MasterLandingRow, "badges"> & { badges: string | null })[];
  return rows.map((r) => ({
    ...r,
    badges: parseBadgesJson(r.badges),
  }));
}

export function insertMasterLanding(data: {
  name: string;
  specialty: string;
  rating?: number;
  phone?: string | null;
  bio?: string | null;
  badges?: string[];
  sortOrder?: number;
  photoPath?: string | null;
  visibleOnLanding?: boolean;
}): MasterLandingRow {
  const id = randomUUID();
  const rating = typeof data.rating === "number" && Number.isFinite(data.rating) ? data.rating : 5;
  const badgesStr = JSON.stringify(data.badges ?? []);
  const sortOrder = typeof data.sortOrder === "number" && Number.isFinite(data.sortOrder) ? data.sortOrder : 0;
  const visible = data.visibleOnLanding !== false ? 1 : 0;
  db.prepare(
    `INSERT INTO masters (id, name, specialty, rating, phone, bio, badges, sortOrder, photoPath, visibleOnLanding)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.name,
    data.specialty,
    rating,
    data.phone ?? null,
    data.bio ?? null,
    badgesStr,
    sortOrder,
    data.photoPath ?? null,
    visible
  );
  const serviceIds = db.prepare("SELECT id FROM services").all() as { id: string }[];
  const link = db.prepare("INSERT INTO master_services (masterId, serviceId) VALUES (?, ?)");
  for (const s of serviceIds) {
    link.run(id, s.id);
  }
  return listMastersAdmin().find((m) => m.id === id)!;
}

export function updateMasterLanding(
  id: string,
  patch: Partial<{
    name: string;
    specialty: string;
    rating: number;
    phone: string | null;
    bio: string | null;
    badges: string[];
    sortOrder: number;
    photoPath: string | null;
    visibleOnLanding: boolean;
  }>
): MasterLandingRow | null {
  const cur = db
    .prepare(
      "SELECT id, name, specialty, rating, phone, bio, badges, sortOrder, photoPath, visibleOnLanding FROM masters WHERE id = ?"
    )
    .get(id) as
    | (Omit<MasterLandingRow, "badges"> & { badges: string | null })
    | undefined;
  if (!cur) return null;
  const name = patch.name ?? cur.name;
  const specialty = patch.specialty ?? cur.specialty;
  const rating = patch.rating ?? cur.rating;
  const phone = patch.phone !== undefined ? patch.phone : cur.phone;
  const bio = patch.bio !== undefined ? patch.bio : cur.bio;
  const badgesStr =
    patch.badges !== undefined ? JSON.stringify(patch.badges) : cur.badges ?? "[]";
  const sortOrder = patch.sortOrder ?? cur.sortOrder;
  const photoPath = patch.photoPath !== undefined ? patch.photoPath : cur.photoPath;
  const visibleOnLanding =
    patch.visibleOnLanding !== undefined ? (patch.visibleOnLanding ? 1 : 0) : cur.visibleOnLanding;
  db.prepare(
    `UPDATE masters SET name = ?, specialty = ?, rating = ?, phone = ?, bio = ?, badges = ?, sortOrder = ?, photoPath = ?, visibleOnLanding = ? WHERE id = ?`
  ).run(name, specialty, rating, phone, bio, badgesStr, sortOrder, photoPath, visibleOnLanding, id);
  return listMastersAdmin().find((m) => m.id === id) ?? null;
}

export type DeleteMasterResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "has_bookings" };

/** Удаляет мастера, если нет записей в bookings. Связи master_services и slot_blocks очищаются. */
export function deleteMasterLanding(id: string): DeleteMasterResult {
  const exists = db.prepare("SELECT 1 FROM masters WHERE id = ?").get(id);
  if (!exists) return { ok: false, reason: "not_found" };
  const bookingCount = db.prepare("SELECT COUNT(*) as n FROM bookings WHERE masterId = ?").get(id) as {
    n: number;
  };
  if (bookingCount.n > 0) return { ok: false, reason: "has_bookings" };

  const run = db.transaction(() => {
    db.prepare("DELETE FROM master_services WHERE masterId = ?").run(id);
    db.prepare("DELETE FROM slot_blocks WHERE masterId = ?").run(id);
    db.prepare("DELETE FROM masters WHERE id = ?").run(id);
  });
  run();
  return { ok: true };
}

export interface EmployeeRow {
  id: string;
  name: string;
  login: string;
  masterId: string | null;
  masterName: string | null;
  permissions: EmployeePermissions;
  isActive: number;
  hasAccess: boolean;
  createdAt: string;
}

function mapEmployeeRow(row: {
  id: string;
  name: string;
  login: string;
  passwordHash: string | null;
  masterId: string | null;
  permissions?: string | null;
  role?: string;
  isActive: number;
  createdAt: string;
  masterName?: string | null;
}): EmployeeRow {
  return {
    id: row.id,
    name: row.name,
    login: row.login,
    masterId: row.masterId,
    masterName: row.masterName ?? null,
    permissions: row.permissions
      ? parseEmployeePermissions(row.permissions)
      : parseEmployeePermissions(null),
    isActive: row.isActive,
    hasAccess: Boolean(row.passwordHash) && row.isActive === 1,
    createdAt: row.createdAt,
  };
}

export function listEmployees(): EmployeeRow[] {
  const rows = db
    .prepare(
      `SELECT e.id, e.name, e.login, e.passwordHash, e.masterId, e.permissions, e.isActive, e.createdAt,
              m.name AS masterName
       FROM employees e
       LEFT JOIN masters m ON m.id = e.masterId
       ORDER BY e.name COLLATE NOCASE`
    )
    .all() as Array<{
    id: string;
    name: string;
    login: string;
    passwordHash: string | null;
    masterId: string | null;
    permissions: string | null;
    isActive: number;
    createdAt: string;
    masterName: string | null;
  }>;
  return rows.map(mapEmployeeRow);
}

export function getEmployeeByLogin(login: string): (EmployeeRow & { passwordHash: string | null }) | null {
  const row = db
    .prepare(
      `SELECT e.id, e.name, e.login, e.passwordHash, e.masterId, e.permissions, e.isActive, e.createdAt,
              m.name AS masterName
       FROM employees e
       LEFT JOIN masters m ON m.id = e.masterId
       WHERE lower(e.login) = lower(?)`
    )
    .get(login.trim()) as
    | {
        id: string;
        name: string;
        login: string;
        passwordHash: string | null;
        masterId: string | null;
        permissions: string | null;
        isActive: number;
        createdAt: string;
        masterName: string | null;
      }
    | undefined;
  if (!row) return null;
  return { ...mapEmployeeRow(row), passwordHash: row.passwordHash };
}

export function insertEmployee(input: {
  name: string;
  login: string;
  password?: string | null;
  masterId?: string | null;
  permissions?: EmployeePermissions;
  isActive?: boolean;
}): EmployeeRow {
  const id = "emp-" + randomUUID();
  const createdAt = new Date().toISOString();
  const passwordHash = input.password ? hashEmployeePassword(input.password) : null;
  const isActive = input.isActive === false ? 0 : 1;
  const permissions = serializeEmployeePermissions(
    input.permissions ?? DEFAULT_EMPLOYEE_PERMISSIONS
  );
  db.prepare(
    `INSERT INTO employees (id, name, login, passwordHash, masterId, role, permissions, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, 'master', ?, ?, ?)`
  ).run(
    id,
    input.name.trim(),
    input.login.trim(),
    passwordHash,
    input.masterId ?? null,
    permissions,
    isActive,
    createdAt
  );
  return listEmployees().find((e) => e.id === id)!;
}

export function updateEmployee(
  id: string,
  patch: {
    name?: string;
    login?: string;
    password?: string | null;
    revokeAccess?: boolean;
    masterId?: string | null;
    permissions?: EmployeePermissions;
    isActive?: boolean;
  }
): EmployeeRow | null {
  const cur = db
    .prepare("SELECT id, passwordHash FROM employees WHERE id = ?")
    .get(id) as { id: string; passwordHash: string | null } | undefined;
  if (!cur) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (patch.name !== undefined) {
    fields.push("name = ?");
    values.push(patch.name.trim());
  }
  if (patch.login !== undefined) {
    fields.push("login = ?");
    values.push(patch.login.trim());
  }
  if (patch.masterId !== undefined) {
    fields.push("masterId = ?");
    values.push(patch.masterId);
  }
  if (patch.permissions !== undefined) {
    fields.push("permissions = ?");
    values.push(serializeEmployeePermissions(patch.permissions));
  }
  if (patch.isActive !== undefined) {
    fields.push("isActive = ?");
    values.push(patch.isActive ? 1 : 0);
  }
  if (patch.revokeAccess) {
    fields.push("passwordHash = ?");
    values.push(null);
  } else if (patch.password) {
    fields.push("passwordHash = ?");
    values.push(hashEmployeePassword(patch.password));
  }

  if (fields.length) {
    values.push(id);
    db.prepare(`UPDATE employees SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }
  return listEmployees().find((e) => e.id === id) ?? null;
}

export function getEmployeeLoginById(id: string): string | null {
  const row = db.prepare("SELECT login FROM employees WHERE id = ?").get(id) as
    | { login: string }
    | undefined;
  return row?.login ?? null;
}

export function getEmployeePermissionsById(id: string): EmployeePermissions | null {
  const row = db.prepare("SELECT permissions FROM employees WHERE id = ?").get(id) as
    | { permissions: string | null }
    | undefined;
  if (!row) return null;
  return parseEmployeePermissions(row.permissions);
}

export function deleteEmployee(id: string): boolean {
  const r = db.prepare("DELETE FROM employees WHERE id = ?").run(id);
  return r.changes > 0;
}

export { db };
export { ALL_MASTERS_BLOCK_ID } from "./slotBlockConstants";
