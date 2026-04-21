import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "node:crypto";
import { runSchemaMigrations } from "./schemaMigrate";
import { ALL_MASTERS_BLOCK_ID } from "./slotBlockConstants";
import { SALON_SLOT_END_HOUR_EXCLUSIVE, SALON_SLOT_START_HOUR } from "./salonHours";

// График: Пн–Пт 12:00–21:00 (интервал 1 ч), в 22:00 закрыты. Часы — по времени салона (Москва).
export const SLOT_START_HOUR = SALON_SLOT_START_HOUR;
export const SLOT_END_HOUR = SALON_SLOT_END_HOUR_EXCLUSIVE; // последний слот 21:00–22:00
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
  const parts = slotId.split("-");
  if (parts.length < 5) return null;
  const masterId = parts[0];
  const blockDate = parts.slice(1, 4).join("-");
  const hour = parseInt(parts[4], 10);
  if (isNaN(hour) || hour < SLOT_START_HOUR || hour >= SLOT_END_HOUR) return null;
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

export function getSlots(masterId: string, dateStr: string): TimeSlot[] | null {
  const master = getMasterById(masterId);
  if (!master) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12 - SALON_UTC_OFFSET_HOURS, 0, 0, 0));
  if (isNaN(noonUtc.getTime())) return null;
  const day = noonUtc.getUTCDay();
  if (day === 0 || day === 6) return [];
  const slots: TimeSlot[] = [];
  const dateOnly = dateStr;
  for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
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
    slots.push({
      id: slotId,
      masterId,
      start: slotStart,
      end: slotEnd,
      available: !occupied && !blocked,
    });
  }
  return slots;
}

export function createBooking(
  masterId: string,
  serviceId: string,
  slotId: string,
  clientName: string,
  clientPhone: string,
  comment?: string
): Booking | null {
  const master = getMasterById(masterId);
  if (!master) return null;
  const serviceRow = db.prepare("SELECT id, name FROM services WHERE id = ?").get(serviceId) as
    | { id: string; name: string }
    | undefined;
  if (!serviceRow) return null;
  const parsed = parseSlotId(slotId);
  if (!parsed || parsed.masterId !== masterId) return null;
  const { slotStart, slotEnd } = parsed;
  const occupied = db
    .prepare(
      "SELECT 1 FROM bookings WHERE masterId = ? AND slotStart = ? AND status != ?"
    )
    .get(masterId, slotStart, "cancelled");
  if (occupied) return null;
  if (isSlotBlocked(masterId, parsed.blockDate, parsed.hour)) return null;

  const id = "b-" + Date.now();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO bookings (id, masterId, masterName, serviceId, serviceName, clientName, clientPhone, slotStart, slotEnd, status, comment, masterComment, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
  ).run(
    id,
    masterId,
    master.name,
    serviceId,
    serviceRow.name,
    clientName,
    clientPhone,
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
  if (hour < SLOT_START_HOUR || hour >= SLOT_END_HOUR) return null;
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

export function listBookings(limit = 200): Booking[] {
  return db
    .prepare(
      `SELECT id, masterId, masterName, serviceId, serviceName, clientName, clientPhone, slotStart, slotEnd, status, comment, masterComment, createdAt
       FROM bookings ORDER BY datetime(slotStart) DESC LIMIT ?`
    )
    .all(limit) as Booking[];
}

const bookingSelect = `SELECT id, masterId, masterName, serviceId, serviceName, clientName, clientPhone, slotStart, slotEnd, status, comment, masterComment, createdAt FROM bookings WHERE id = ?`;

export function getBookingById(id: string): Booking | null {
  const row = db.prepare(bookingSelect).get(id) as Booking | undefined;
  return row ?? null;
}

export function patchBooking(
  id: string,
  patch: { status?: string; masterComment?: string | null }
): Booking | null {
  const cur = db.prepare(bookingSelect).get(id) as Booking | undefined;
  if (!cur) return null;
  const nextStatus = patch.status !== undefined ? patch.status : cur.status;
  const nextMasterComment =
    patch.masterComment !== undefined ? patch.masterComment : cur.masterComment ?? null;
  db.prepare("UPDATE bookings SET status = ?, masterComment = ? WHERE id = ?").run(
    nextStatus,
    nextMasterComment,
    id
  );
  return (db.prepare(bookingSelect).get(id) as Booking | undefined) ?? null;
}

export function updateBookingStatus(id: string, status: string): Booking | null {
  return patchBooking(id, { status });
}

export interface ClientAggregate {
  clientPhone: string;
  displayName: string;
  visitCount: number;
  lastSlotStart: string;
}

export function getClientAggregates(): ClientAggregate[] {
  const rows = db
    .prepare(
      `SELECT
         b.clientPhone AS clientPhone,
         (SELECT b2.clientName FROM bookings b2 WHERE b2.clientPhone = b.clientPhone ORDER BY datetime(b2.createdAt) DESC, b2.id DESC LIMIT 1) AS displayName,
         COUNT(*) AS visitCount,
         MAX(datetime(b.slotStart)) AS lastSlotStart
       FROM bookings b
       GROUP BY b.clientPhone
       ORDER BY lastSlotStart DESC`
    )
    .all() as ClientAggregate[];
  return rows;
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

export { db };
export { ALL_MASTERS_BLOCK_ID } from "./slotBlockConstants";
