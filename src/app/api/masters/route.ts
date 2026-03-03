import { NextResponse } from "next/server";
import { getMasters } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId") ?? undefined;
    const masters = getMasters(serviceId);
    return NextResponse.json(masters);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
