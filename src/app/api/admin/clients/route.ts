import { NextResponse } from "next/server";
import { getClientAggregates, type ClientAggregateFilters } from "@/lib/db";
import { requireTabSession } from "@/lib/requireAdmin";

export async function GET(request: Request) {
  const auth = await requireTabSession("clients");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || undefined;
  const statusRaw = searchParams.get("status")?.trim();
  const visitsMinRaw = searchParams.get("visitsMin");

  const filters: ClientAggregateFilters = {};
  if (search) filters.search = search;
  if (
    statusRaw === "done" ||
    statusRaw === "cancelled" ||
    statusRaw === "planned" ||
    statusRaw === "all"
  ) {
    filters.status = statusRaw;
  }
  const visitsMin = visitsMinRaw ? Number(visitsMinRaw) : NaN;
  if (Number.isFinite(visitsMin) && visitsMin > 0) {
    filters.visitsMin = Math.floor(visitsMin);
  }

  return NextResponse.json(getClientAggregates(filters));
}
