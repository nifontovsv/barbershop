#!/usr/bin/env node
/**
 * Установить Telegram chat_id для мастера (для уведомлений о записи).
 * Запуск: node scripts/set-master-telegram.mjs <masterId> <chatId>
 * Пример: node scripts/set-master-telegram.mjs 1 123456789
 *
 * Как узнать свой chat_id:
 * 1. Напишите вашему боту в Telegram любое сообщение.
 * 2. Откройте в браузере: https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates
 * 3. В ответе найдите "chat":{"id": 123456789} — это ваш chat_id.
 */

import { createRequire } from "node:module";
import path from "path";
import fs from "fs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const dbDir = path.join(process.cwd(), "data");
const dbPath = process.env.DATABASE_PATH || path.join(dbDir, "barbershop.db");

const [masterId, chatId] = process.argv.slice(2);
if (!masterId || !chatId) {
  console.error("Использование: node scripts/set-master-telegram.mjs <masterId> <chatId>");
  console.error("Пример: node scripts/set-master-telegram.mjs 1 123456789");
  process.exit(1);
}

if (!fs.existsSync(dbPath)) {
  console.error("БД не найдена:", dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
const stmt = db.prepare("UPDATE masters SET telegramChatId = ? WHERE id = ?");
const result = stmt.run(chatId.trim(), masterId.trim());
db.close();

if (result.changes === 0) {
  console.error("Мастер с id", masterId, "не найден. Доступные: 1 (Марат), 2 (Владимир)");
  process.exit(1);
}

console.log("OK: для мастера", masterId, "установлен telegramChatId =", chatId);
console.log("Перезапустите приложение и задайте TELEGRAM_BOT_TOKEN в .env");
