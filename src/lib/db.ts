import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// График: Пн–Пт 12:00–21:00 (интервал 1 ч), в 22:00 закрыты. Часы — по времени салона (Москва).
const SLOT_START_HOUR = 12;
const SLOT_END_HOUR = 22; // последний слот 21:00–22:00
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
  if (parts.length < 5) return null;
  const masterId = parts[0];
  const dateStr = parts.slice(1, 4).join("-");
  const hour = parseInt(parts[4], 10);
  if (isNaN(hour) || hour < SLOT_START_HOUR || hour >= SLOT_END_HOUR) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const start = new Date(Date.UTC(y, m - 1, d, hour - SALON_UTC_OFFSET_HOURS, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, hour + 1 - SALON_UTC_OFFSET_HOURS, 0, 0, 0));
  if (isNaN(start.getTime())) return null;
  return {
    masterId,
    slotStart: start.toISOString(),
    slotEnd: end.toISOString(),
  };
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
