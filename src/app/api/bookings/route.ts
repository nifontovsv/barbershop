import { NextResponse } from "next/server";
import { createBooking } from "@/lib/booking";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      masterId,
      serviceId,
      slotId,
      clientName,
      clientPhone,
      comment,
    } = body as {
      masterId?: string;
      serviceId?: string;
      slotId?: string;
      clientName?: string;
      clientPhone?: string;
      comment?: string;
    };

    if (
      !masterId ||
      !serviceId ||
      !slotId ||
      typeof clientName !== "string" ||
      typeof clientPhone !== "string"
    ) {
      return NextResponse.json(
        { message: "Укажите masterId, serviceId, slotId, clientName, clientPhone" },
        { status: 400 }
      );
    }

    const name = clientName.trim();
    const phone = clientPhone.trim();
    if (name.length < 2) {
      return NextResponse.json(
        { message: "Имя должно содержать не менее 2 символов" },
        { status: 400 }
      );
    }
    if (phone.length < 10) {
      return NextResponse.json(
        { message: "Укажите корректный телефон" },
        { status: 400 }
      );
    }

    const booking = createBooking(
      masterId,
      serviceId,
      slotId,
      name,
      phone,
      typeof comment === "string" ? comment.trim() || undefined : undefined
    );

    if (!booking) {
      return NextResponse.json(
        { message: "Мастер не найден, услуга не найдена или время уже занято" },
        { status: 409 }
      );
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
