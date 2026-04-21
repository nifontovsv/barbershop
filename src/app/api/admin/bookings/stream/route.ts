import { requireAdminSession } from "@/lib/requireAdmin";
import { onBookingsChanged, type BookingsRealtimeReason } from "@/lib/adminBookingsRealtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE-поток: при изменении записей сервер шлёт событие — админка подтягивает список.
 * (Классический WebSocket в App Router без отдельного процесса не поддерживается.)
 */
export async function GET() {
  const deny = await requireAdminSession();
  if (deny) return deny;

  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | undefined;
  let ping: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (reason: BookingsRealtimeReason) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ reason, t: Date.now() })}\n\n`)
          );
        } catch {
          /* stream closed */
        }
      };

      unsubscribe = onBookingsChanged(send);

      ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (ping) clearInterval(ping);
        }
      }, 25000);
    },
    cancel() {
      if (ping) clearInterval(ping);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
