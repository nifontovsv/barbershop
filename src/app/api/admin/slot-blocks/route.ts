import { NextResponse } from "next/server";
import { ALL_MASTERS_BLOCK_ID } from "@/lib/slotBlockConstants";
import {
  forbidden,
  isEnvAdmin,
  requireTabSession,
  resolveSessionPermissions,
} from "@/lib/requireAdmin";
import { addSlotBlock, listSlotBlocks } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await requireTabSession("slot_blocks");
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  if (from && to) {
    return NextResponse.json(listSlotBlocks(from, to));
  }
  return NextResponse.json(listSlotBlocks());
}

export async function POST(request: Request) {
  const auth = await requireTabSession("slot_blocks");
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const perms = resolveSessionPermissions(session);
  try {
    const body = await request.json();
    const masterIdRaw = body.masterId as string | undefined;
    const blockDate = body.blockDate as string | undefined;
    const note = typeof body.note === "string" ? body.note : undefined;

    let masterId: string;
    if (!isEnvAdmin(session) && perms.slotBlocksOwnOnly) {
      if (!session.masterId) {
        return NextResponse.json({ message: "У сотрудника не привязан мастер" }, { status: 403 });
      }
      masterId = session.masterId;
    } else {
      masterId =
        masterIdRaw === ALL_MASTERS_BLOCK_ID || masterIdRaw === "*"
          ? ALL_MASTERS_BLOCK_ID
          : masterIdRaw ?? "";
    }

    if (!masterId || !blockDate) {
      return NextResponse.json(
        { message: "Укажите masterId и blockDate (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (!isEnvAdmin(session) && masterId === ALL_MASTERS_BLOCK_ID) {
      return forbidden("Можно блокировать слоты только для себя");
    }

    const hoursRaw = body.hours;
    if (Array.isArray(hoursRaw) && hoursRaw.length > 0) {
      const hours = [...new Set(hoursRaw.map((h: unknown) => Number(h)).filter((h) => Number.isFinite(h)))].sort(
        (a, b) => a - b
      );
      if (hours.length === 0) {
        return NextResponse.json({ message: "Укажите хотя бы один корректный час в hours" }, { status: 400 });
      }
      const created = [] as Exclude<ReturnType<typeof addSlotBlock>, null>[];
      const skippedHours: number[] = [];
      for (const hour of hours) {
        const row = addSlotBlock(masterId, blockDate, hour, note);
        if (row) created.push(row);
        else skippedHours.push(hour);
      }
      if (created.length === 0) {
        return NextResponse.json(
          {
            message: "Не удалось создать блокировки (дубликаты или неверные часы)",
            created: [],
            skippedHours,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { created, skippedHours: skippedHours.length ? skippedHours : undefined },
        { status: 201 }
      );
    }

    const hour = typeof body.hour === "number" ? body.hour : Number(body.hour);
    if (!Number.isFinite(hour)) {
      return NextResponse.json(
        { message: "Укажите hour или массив hours" },
        { status: 400 }
      );
    }
    const row = addSlotBlock(masterId, blockDate, hour, note);
    if (!row) {
      return NextResponse.json(
        { message: "Не удалось создать блокировку (возможно дубликат или неверный час)" },
        { status: 409 }
      );
    }
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
