import { getMasterById } from "./db";
import type { Booking } from "./db";

/**
 * Уведомление мастеру о новой записи.
 * Поддерживаются: Telegram (если задан telegramChatId), SMS (если задан phone).
 * При отсутствии настроенного канала — только лог.
 */
export async function notifyMaster(masterId: string, booking: Booking): Promise<void> {
  const master = getMasterById(masterId);
  if (!master) return;

  const slotTime = new Date(booking.slotStart).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const slotDate = new Date(booking.slotStart).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const message = `Новая запись: ${booking.clientName}, ${booking.serviceName}, ${slotDate} ${slotTime}. Barbershop`;

  if (master.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
    await sendTelegram(master.telegramChatId, message);
    return;
  }

  if (master.phone && process.env.SMS_API_ID) {
    await sendSms(master.phone, message);
    return;
  }

  console.log(`[Notify] Master ${masterId}: no channel configured. Message: ${message}`);
}

async function sendTelegram(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram send failed: ${err}`);
  }
}

async function sendSms(phone: string, text: string): Promise<void> {
  const apiId = process.env.SMS_API_ID;
  if (!apiId) return;
  // Пример для SMS.ru: GET https://sms.ru/sms/send?api_id=...&to=...&msg=...
  const url = new URL("https://sms.ru/sms/send");
  url.searchParams.set("api_id", apiId);
  url.searchParams.set("to", phone.replace(/\D/g, ""));
  url.searchParams.set("msg", text);
  url.searchParams.set("json", "1");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`SMS send failed: ${res.status}`);
  const data = (await res.json()) as { status: string };
  if (data.status !== "OK") throw new Error(`SMS.ru error: ${data.status}`);
}
