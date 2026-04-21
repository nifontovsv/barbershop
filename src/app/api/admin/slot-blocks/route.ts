import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { addSlotBlock, ALL_MASTERS_BLOCK_ID, listSlotBlocks } from "@/lib/db";

export async function GET(request: Request) {
  const deny = await requireAdminSession();
  if (deny) return deny;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  if (from && to) {
    return NextResponse.json(listSlotBlocks(from, to));
  }
  return NextResponse.json(listSlotBlocks());
}

export async function POST(request: Request) {
  const deny = await requireAdminSession();
  if (deny) return deny;
  try {
    const body = await request.json();
    const masterIdRaw = body.masterId as string | undefined;
    const blockDate = body.blockDate as string | undefined;
    const note = typeof body.note === "string" ? body.note : undefined;
    const masterId =
      masterIdRaw === ALL_MASTERS_BLOCK_ID || masterIdRaw === "*"
        ? ALL_MASTERS_BLOCK_ID
        : masterIdRaw ?? "";

    if (!masterId || !blockDate) {
      return NextResponse.json(
        { message: "Укажите masterId и blockDate (YYYY-MM-DD)" },
        { status: 400 }
      );
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
