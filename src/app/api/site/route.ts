import { NextResponse } from "next/server";
import { getPublicSitePayload } from "@/lib/sitePublic";

export async function GET() {
  try {
    return NextResponse.json(getPublicSitePayload());
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
