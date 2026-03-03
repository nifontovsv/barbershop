import { NextResponse } from "next/server";
import { getServices } from "@/lib/db";

export async function GET() {
  try {
    const services = getServices();
    return NextResponse.json(services);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
