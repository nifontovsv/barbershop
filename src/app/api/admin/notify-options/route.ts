import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { isClientStatusSmsEnabled } from "@/lib/notify";

/** Подсказки для админки (без секретов). */
export async function GET() {
  const deny = await requireAdminSession();
  if (deny) return deny;
  return NextResponse.json({ clientStatusSms: isClientStatusSmsEnabled() });
}
