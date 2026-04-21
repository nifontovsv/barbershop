import type Database from "better-sqlite3";

/** Совпадает с логикой слотов в db.ts (Europe/Moscow) */
const SALON_UTC_OFFSET_HOURS = 3;

function salonSlotIso(y: number, mo: number, d: number, hour: number): { start: string; end: string } {
  const start = new Date(Date.UTC(y, mo - 1, d, hour - SALON_UTC_OFFSET_HOURS, 0, 0, 0));
  const end = new Date(Date.UTC(y, mo - 1, d, hour + 1 - SALON_UTC_OFFSET_HOURS, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

function seedMedia(db: Database.Database) {
  const now = new Date().toISOString();
  const ins = db.prepare(
    "INSERT OR IGNORE INTO media_items (id, kind, path, sortOrder, alt, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
  );
  let order = 0;
  for (let n = 1; n <= 13; n++) {
    ins.run(
      `hero-${n}`,
      "hero_slider",
      `/images/barbershop/${n}.jpg`,
      order++,
      `Слайдер — фото ${n}`,
      now
    );
  }
  for (let n = 1; n <= 19; n++) {
    ins.run(
      `gd-${n}`,
      "gallery_design",
      `/images/design/${n}.jpg`,
      n,
      `Интерьер — фото ${n}`,
      now
    );
  }
  for (let n = 1; n <= 21; n++) {
    ins.run(
      `gp-${n}`,
      "gallery_products",
      `/images/products/${n}.jpg`,
      n,
      `Товар — фото ${n}`,
      now
    );
  }
  const clientNums = [1, 2, 3, 4, 5, 6, 7, 9];
  for (let i = 0; i < clientNums.length; i++) {
    const n = clientNums[i];
    ins.run(
      `gc-${n}`,
      "gallery_clients",
      `/images/clients/${n}.webp`,
      i + 1,
      `Клиент — фото ${n}`,
      now
    );
  }
}

/** Демо-записи для вкладок «Клиенты» и «Записи» в админке (однократно, id с префиксом demo-) */
function seedDemoBookings(db: Database.Database) {
  const already = (db.prepare("SELECT COUNT(*) as n FROM bookings WHERE id LIKE 'demo-%'").get() as { n: number })
    .n;
  if (already > 0) return;

  const masters = db.prepare("SELECT id, name FROM masters").all() as { id: string; name: string }[];
  const m1 = masters.find((m) => m.id === "1");
  const m2 = masters.find((m) => m.id === "2");
  if (!m1) return;

  const services = db.prepare("SELECT id, name FROM services LIMIT 3").all() as { id: string; name: string }[];
  const s1 = services[0];
  if (!s1) return;

  const ins = db.prepare(
    `INSERT INTO bookings (id, masterId, masterName, serviceId, serviceName, clientName, clientPhone, slotStart, slotEnd, status, comment, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const a = salonSlotIso(2026, 5, 4, 14);
  ins.run(
    "demo-booking-1",
    m1.id,
    m1.name,
    s1.id,
    s1.name,
    "Алексей",
    "+79001234501",
    a.start,
    a.end,
    "pending",
    "Тестовая заявка из сида",
    "2026-04-15T10:00:00.000Z"
  );

  const b = salonSlotIso(2026, 5, 5, 16);
  ins.run(
    "demo-booking-2",
    m1.id,
    m1.name,
    s1.id,
    s1.name,
    "Алексей П.",
    "+79001234501",
    b.start,
    b.end,
    "confirmed",
    null,
    "2026-04-16T12:00:00.000Z"
  );

  if (m2) {
    const s2 = services[1] ?? s1;
    const c = salonSlotIso(2026, 5, 6, 13);
    ins.run(
      "demo-booking-3",
      m2.id,
      m2.name,
      s2.id,
      s2.name,
      "Сергей",
      "+79005551122",
      c.start,
      c.end,
      "pending",
      "Нужна укладка",
      "2026-04-18T09:30:00.000Z"
    );
  }
}

export function runSchemaMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS slot_blocks (
      id TEXT PRIMARY KEY,
      masterId TEXT NOT NULL,
      blockDate TEXT NOT NULL,
      hour INTEGER NOT NULL,
      note TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_slot_blocks_date ON slot_blocks(blockDate);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_slot_blocks_master_date_hour ON slot_blocks(masterId, blockDate, hour);
    CREATE TABLE IF NOT EXISTS site_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      path TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      alt TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_media_kind_order ON media_items(kind, sortOrder);
  `);

  const cols = db.prepare("PRAGMA table_info(masters)").all() as { name: string }[];
  const has = (n: string) => cols.some((c) => c.name === n);
  if (!has("bio")) db.exec("ALTER TABLE masters ADD COLUMN bio TEXT");
  if (!has("badges")) db.exec("ALTER TABLE masters ADD COLUMN badges TEXT");
  if (!has("sortOrder")) db.exec("ALTER TABLE masters ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0");
  if (!has("photoPath")) db.exec("ALTER TABLE masters ADD COLUMN photoPath TEXT");
  if (!has("visibleOnLanding")) {
    db.exec("ALTER TABLE masters ADD COLUMN visibleOnLanding INTEGER NOT NULL DEFAULT 1");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS service_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0
    );
  `);
  const svcInfo = db.prepare("PRAGMA table_info(services)").all() as { name: string }[];
  const svcHasCol = (n: string) => svcInfo.some((c) => c.name === n);
  if (!svcHasCol("categoryId")) {
    db.exec("ALTER TABLE services ADD COLUMN categoryId TEXT");
  }

  const bookingCols = db.prepare("PRAGMA table_info(bookings)").all() as { name: string }[];
  const bookingHasCol = (n: string) => bookingCols.some((c) => c.name === n);
  if (!bookingHasCol("masterComment")) {
    db.exec("ALTER TABLE bookings ADD COLUMN masterComment TEXT");
  }

  migrateServiceCategoriesFromLegacy(db);

  seedIfEmpty(db);
}

function migrateServiceCategoriesFromLegacy(db: Database.Database) {
  const count = (db.prepare("SELECT COUNT(*) as n FROM service_categories").get() as { n: number }).n;
  if (count === 0) {
    const ins = db.prepare(
      "INSERT INTO service_categories (id, name, sortOrder) VALUES (?, ?, ?)"
    );
    const cats: [string, string, number][] = [
      ["cat-hair", "Мужская стрижка", 0],
      ["cat-camo", "Камуфляж седины", 1],
      ["cat-shave", "Чистое бритьё", 2],
      ["cat-care", "Уход", 3],
    ];
    for (const [id, name, order] of cats) {
      ins.run(id, name, order);
    }
    const hair = ["1", "2", "3", "4", "5", "6", "7"];
    const camo = ["8", "9"];
    const shave = ["10", "11"];
    const care = ["12"];
    const upd = db.prepare("UPDATE services SET categoryId = ? WHERE id = ?");
    for (const id of hair) upd.run("cat-hair", id);
    for (const id of camo) upd.run("cat-camo", id);
    for (const id of shave) upd.run("cat-shave", id);
    for (const id of care) upd.run("cat-care", id);
  } else {
    const first = db.prepare("SELECT id FROM service_categories ORDER BY sortOrder, id LIMIT 1").get() as
      | { id: string }
      | undefined;
    if (first) {
      db.prepare("UPDATE services SET categoryId = ? WHERE categoryId IS NULL OR categoryId = ''").run(
        first.id
      );
    }
  }
}

function seedIfEmpty(db: Database.Database) {
  const insertKv = db.prepare("INSERT OR IGNORE INTO site_kv (key, value) VALUES (?, ?)");
  insertKv.run("footer", JSON.stringify(defaultFooter()));
  insertKv.run("about", JSON.stringify(defaultAbout()));
  insertKv.run("masters_section", JSON.stringify(defaultMastersSection()));
  insertKv.run("gallery_section", JSON.stringify(defaultGallerySection()));
  insertKv.run("header", JSON.stringify(defaultHeader()));
  insertKv.run("parallax_bg", JSON.stringify(defaultParallaxBg()));

  seedMedia(db);
  seedDemoBookings(db);

  const masters = db.prepare("SELECT id, bio FROM masters").all() as { id: string; bio: string | null }[];
  for (const m of masters) {
    if (m.bio == null || m.bio === "") {
      const defaults: Record<string, { bio: string; badges: string }> = {
        "1": {
          badges: JSON.stringify(["Чёткий контур", "Графика", "Борода"]),
          bio: "Меня зовут Марат. Более 10 лет я работаю руками, которые привыкли к точности. Моя страсть — это техника: будь то мощный мотор под капотом или идеально настроенная машинка для стрижки. Я люблю скорость, но в работе ценю не быстроту ради рекорда, а динамику ради результата. Как в гонках важна каждая деталь подвески, так и в стрижке важен каждый миллиметр. Если тебе нужен чёткий, графичный контур и стиль, в котором чувствуется характер — тебе ко мне. Пристегнись, будет интересно.",
        },
        "2": {
          badges: JSON.stringify(["Классика", "Бритьё", "Подбор образа"]),
          bio: "«Радости посещения парикмахера… Такие воспоминания есть у каждого мужчины, кроме тех, кого мамы стригли дома.»\n\nРаботаю по призванию более 14 лет, заинтересованно изучаю ремесло и сегодня. Встречать джентельменов в стенах парикмахерской для меня всегда большое событие — здесь мы говорим на актуальные темы и внимательно относимся к процессу, как и к беседе, разумеется придав ценность времени. Безусловно создаём уникальные образы, подчёркивающие стиль. Всё происходящее здесь для меня — случай, когда работа является увлечением, которое приносит удовольствие. Я люблю мотоциклы, редкие автомобили, достойное кино, музыку, спорт и свою работу.",
        },
      };
      const d = defaults[m.id];
      if (d) {
        db.prepare("UPDATE masters SET bio = ?, badges = ? WHERE id = ?").run(d.bio, d.badges, m.id);
      }
    }
  }
}

function defaultFooter() {
  return {
    brandName: "Мужская Парикмахерская",
    address: "ул. Мансура Хасанова, 15, Казань",
    vkUrl: "https://vk.ru/id897263128",
    url2gis: "https://2gis.ru/kazan/firm/70000001095119622",
    urlYandexMaps:
      "https://yandex.ru/maps/org/muzhskaya_parikmakherskaya/74689483204/?ll=49.184657%2C55.778892&z=17",
  };
}

function defaultAbout() {
  return {
    title: "О нас",
    subtitle: "Мужская парикмахерская с характером и вниманием к деталям.",
    badges: ["Казань", "Атмосфера"],
    paragraphs: [
      "Мужская парикмахерская — это место с индивидуальным подходом к личности каждого. Место для отдыха, где можно перевести дух от повседневной спешки, привести себя в порядок, услышать приятную музыку и хорошо побеседовать. Найдём именно твой образ — со вкусом.",
      "Здесь рады каждому, у кого добрые намерения и желание хорошо подстричься.",
    ],
    tiles: [
      { label: "Подход", value: "Индивидуально под тебя" },
      { label: "Акцент", value: "Чёткие линии и стиль" },
      { label: "Сервис", value: "Комфорт + разговор по делу" },
    ],
  };
}

function defaultMastersSection() {
  return {
    title: "Наши мастера",
    subtitle: "Настроим стиль по форме лица, характеру и ритму жизни.",
  };
}

function defaultGallerySection() {
  return {
    sectionTitle: "Галерея",
    sectionSubtitle: "Интерьер, товары и наши клиенты — листайте и вдохновляйтесь.",
    tabs: [
      { id: "design", label: "Интерьер", subtitle: "Атмосфера и детали" },
      { id: "products", label: "Товары", subtitle: "Уход и стайлинг" },
      { id: "clients", label: "Клиенты", subtitle: "Наши работы" },
    ],
  };
}

function defaultHeader() {
  return {
    logoPath: "/logo.png",
    title: "Мужская Парикмахерская",
    phoneTel: "+79179359828",
    phoneDisplay: "+7 (917) 935-98-28",
  };
}

function defaultParallaxBg() {
  return {
    imagePath: "/images/parallax/parallax-bikes.jpg",
  };
}
