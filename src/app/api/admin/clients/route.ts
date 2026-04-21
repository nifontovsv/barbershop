import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getClientAggregates } from "@/lib/db";

export async function GET() {
  const deny = await requireAdminSession();
  if (deny) return deny;
  return NextResponse.json(getClientAggregates());
}
