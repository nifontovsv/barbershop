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

/** Включена ли отправка SMS клиенту при смене статуса (подтверждение / отмена). */
export function isClientStatusSmsEnabled(): boolean {
  if (!process.env.SMS_API_ID) return false;
  const v = process.env.SMS_NOTIFY_CLIENT_STATUS?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type ClientSmsStatusHint =
  | { send: false; reason: "not_status_change" | "not_terminal_status" | "sms_disabled" | "no_phone" }
  | { send: true; kind: "confirmed" | "cancelled" };

/**
 * Ожидается ли SMS клиенту после смены статуса (для UI и ответа API).
 */
export function getClientSmsStatusChangeHint(
  previousStatus: string,
  booking: Booking
): ClientSmsStatusHint {
  if (previousStatus === booking.status) {
    return { send: false, reason: "not_status_change" };
  }
  if (booking.status !== "confirmed" && booking.status !== "cancelled") {
    return { send: false, reason: "not_terminal_status" };
  }
  if (!isClientStatusSmsEnabled()) {
    return { send: false, reason: "sms_disabled" };
  }
  if (!booking.clientPhone.replace(/\D/g, "")) {
    return { send: false, reason: "no_phone" };
  }
  return { send: true, kind: booking.status };
}

/**
 * SMS клиенту при смене статуса записи на «Подтверждено» или «Отменено» (только при реальном переходе статуса).
 */
export async function notifyClientBookingStatusChange(
  previousStatus: string,
  booking: Booking
): Promise<void> {
  const hint = getClientSmsStatusChangeHint(previousStatus, booking);
  if (!hint.send) {
    if (hint.reason === "no_phone") {
      console.log("[Notify] Client SMS skipped: no phone on booking");
    } else if (hint.reason === "sms_disabled") {
      console.log(
        "[Notify] Client SMS skipped: set SMS_API_ID and SMS_NOTIFY_CLIENT_STATUS=1 in .env"
      );
    }
    return;
  }

  const slotTime = new Date(booking.slotStart).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const slotDate = new Date(booking.slotStart).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const when = `${slotDate} ${slotTime}`;
  const verb = hint.kind === "confirmed" ? "подтверждена" : "отменена";
  const message = `Запись ${verb}: ${booking.serviceName}, ${when}. Barbershop`;

  await sendSms(booking.clientPhone, message);
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

type SmsRuSmsEntry = {
  status: string;
  status_code?: number;
  status_text?: string;
  sms_id?: string;
};

type SmsRuSendJson = {
  status: string;
  status_code?: number;
  status_text?: string;
  sms?: Record<string, SmsRuSmsEntry>;
};

async function sendSms(phone: string, text: string): Promise<void> {
  const apiId = process.env.SMS_API_ID;
  if (!apiId) return;
  // SMS.ru: https://sms.ru/api — при json=1 ошибка по номеру в sms[номер].status, не только в корне
  const url = new URL("https://sms.ru/sms/send");
  url.searchParams.set("api_id", apiId);
  url.searchParams.set("to", phone.replace(/\D/g, ""));
  url.searchParams.set("msg", text);
  url.searchParams.set("json", "1");
  const from = process.env.SMS_FROM?.trim();
  if (from) {
    url.searchParams.set("from", from);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`SMS send failed: HTTP ${res.status}`);
  const data = (await res.json()) as SmsRuSendJson;
  if (data.status !== "OK") {
    throw new Error(`SMS.ru: ${data.status_text ?? data.status_code ?? data.status}`);
  }
  const digits = phone.replace(/\D/g, "");
  const byPhone = data.sms?.[digits] ?? data.sms?.[`${digits}`];
  if (byPhone && byPhone.status === "ERROR") {
    throw new Error(
      `SMS.ru по номеру: ${byPhone.status_text ?? byPhone.status_code ?? "ERROR"}`
    );
  }
  if (data.sms) {
    for (const [num, entry] of Object.entries(data.sms)) {
      if (entry.status === "ERROR") {
        throw new Error(`SMS.ru ${num}: ${entry.status_text ?? entry.status_code ?? "ERROR"}`);
      }
    }
  }
  if (byPhone?.sms_id) {
    console.log(`[Notify] SMS queued, id=${byPhone.sms_id}`);
  }
}
