import { NextResponse } from "next/server";
import { getServices, listServiceCategories } from "@/lib/db";

export async function GET() {
  try {
    const categories = listServiceCategories();
    const services = getServices();
    return NextResponse.json({ categories, services });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
