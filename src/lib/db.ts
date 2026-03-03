import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const SLOT_START_HOUR = 10;
const SLOT_END_HOUR = 18;

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
  insertService.run("1", "Мужская стрижка", 45, 800, 1);
  insertService.run("2", "Стрижка бороды", 30, 500, 2);
  insertService.run("3", "Детская стрижка", 30, 600, 3);
  insertService.run("4", "Стрижка + борода", 60, 1200, 4);
}

// Seed masters
const masterCount = db.prepare("SELECT COUNT(*) as n FROM masters").get() as { n: number };
if (masterCount.n === 0) {
  const insertMaster = db.prepare(
    "INSERT INTO masters (id, name, specialty, rating, phone) VALUES (?, ?, ?, ?, ?)"
  );
  insertMaster.run("1", "Алексей", "Мужские стрижки", 4.9, "+79001234567");
  insertMaster.run("2", "Дмитрий", "Борода и усы", 4.8, "+79001234568");
  insertMaster.run("3", "Максим", "Детские стрижки", 4.7, "+79001234569");

  const linkMasterService = db.prepare(
    "INSERT INTO master_services (masterId, serviceId) VALUES (?, ?)"
  );
  linkMasterService.run("1", "1");
  linkMasterService.run("1", "4");
  linkMasterService.run("2", "2");
  linkMasterService.run("2", "4");
  linkMasterService.run("3", "3");
  linkMasterService.run("3", "1");
}

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
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
  comment?: string | null;
  createdAt: string;
}

export function getServices(): Service[] {
  const rows = db
    .prepare(
      "SELECT id, name, durationMinutes, price, sortOrder FROM services ORDER BY sortOrder, id"
    )
    .all() as Service[];
  return rows;
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

function parseSlotId(slotId: string): { masterId: string; slotStart: string; slotEnd: string } | null {
  const parts = slotId.split("-");
  if (parts.length < 4) return null;
  const masterId = parts[0];
  const dateStr = parts.slice(1, 4).join("-");
  const hour = parseInt(parts[4], 10);
  if (isNaN(hour) || hour < SLOT_START_HOUR || hour >= SLOT_END_HOUR) return null;
  const date = new Date(dateStr + "T00:00:00.000Z");
  if (isNaN(date.getTime())) return null;
  const start = new Date(date);
  start.setUTCHours(hour, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(hour + 1, 0, 0, 0);
  return {
    masterId,
    slotStart: start.toISOString(),
    slotEnd: end.toISOString(),
  };
}

export function getSlots(masterId: string, dateStr: string): TimeSlot[] | null {
  const master = getMasterById(masterId);
  if (!master) return null;
  const date = new Date(dateStr + "T00:00:00.000Z");
  if (isNaN(date.getTime())) return null;
  const slots: TimeSlot[] = [];
  const dateOnly = dateStr;
  for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
    const start = new Date(date);
    start.setUTCHours(h, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(h + 1, 0, 0, 0);
    const slotId = `${masterId}-${dateOnly}-${String(h).padStart(2, "0")}`;
    const slotStart = start.toISOString();
    const slotEnd = end.toISOString();
    const occupied = db
      .prepare(
        "SELECT 1 FROM bookings WHERE masterId = ? AND slotStart = ? AND status != ?"
      )
      .get(masterId, slotStart, "cancelled");
    slots.push({
      id: slotId,
      masterId,
      start: slotStart,
      end: slotEnd,
      available: !occupied,
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

  const id = "b-" + Date.now();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO bookings (id, masterId, masterName, serviceId, serviceName, clientName, clientPhone, slotStart, slotEnd, status, comment, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
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
    createdAt,
  };
}

export { db };
