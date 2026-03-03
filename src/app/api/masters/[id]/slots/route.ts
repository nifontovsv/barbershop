import { NextResponse } from "next/server";
import { getSlots } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date) {
      return NextResponse.json(
        { message: "Параметр date обязателен (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    const slots = getSlots(id, date);
    if (slots === null) {
      return NextResponse.json(
        { message: "Мастер не найден или неверный формат даты" },
        { status: 400 }
      );
    }
    return NextResponse.json(slots);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
