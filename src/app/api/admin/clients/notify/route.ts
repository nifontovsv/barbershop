import { NextResponse } from "next/server";
import { getClientAggregates } from "@/lib/db";
import { sendBulkClientNotifications } from "@/lib/notify";
import { requireTabSession } from "@/lib/requireAdmin";

export async function POST(request: Request) {
  const auth = await requireTabSession("clients");
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const clientPhones = Array.isArray(body.clientPhones)
    ? body.clientPhones.filter((p): p is string => typeof p === "string" && p.trim() !== "")
    : [];
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const sendSms = body.sendSms === true;
  const sendEmail = body.sendEmail === true;
  const emailSubject = typeof body.emailSubject === "string" ? body.emailSubject : undefined;

  if (clientPhones.length === 0) {
    return NextResponse.json({ message: "Выберите хотя бы одного клиента" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ message: "Введите текст сообщения" }, { status: 400 });
  }
  if (!sendSms && !sendEmail) {
    return NextResponse.json({ message: "Выберите канал: SMS или Email" }, { status: 400 });
  }

  const phoneSet = new Set(clientPhones);
  const clients = getClientAggregates().filter((c) => phoneSet.has(c.clientPhone));
  const emails = clients.map((c) => c.clientEmail).filter((e): e is string => Boolean(e));

  const result = await sendBulkClientNotifications({
    phones: clients.map((c) => c.clientPhone),
    emails,
    message,
    sendSms,
    sendEmail,
    emailSubject,
  });

  return NextResponse.json(result);
}
