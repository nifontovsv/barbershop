import { requireAdminSession } from "@/lib/requireAdmin";
import { onBookingsChanged, type BookingsRealtimePayload } from "@/lib/adminBookingsRealtime";
import { getBookingsRevision, getLastBookingsEvent } from "@/lib/bookingsRevision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_MS = 1000;

/**
 * SSE-поток: при изменении записей сервер шлёт событие — админка подтягивает список.
 * In-memory emitter + опрос ревизии в SQLite (работает между воркерами Next.js).
 */
export async function GET() {
  const deny = await requireAdminSession();
  if (deny) return deny;

  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | undefined;
  let ping: ReturnType<typeof setInterval> | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;
  let lastRevision = getBookingsRevision();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: BookingsRealtimePayload) => {
        lastRevision = getBookingsRevision();
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ ...payload, t: Date.now() })}\n\n`)
          );
        } catch {
          /* stream closed */
        }
      };

      unsubscribe = onBookingsChanged(send);

      poll = setInterval(() => {
        const rev = getBookingsRevision();
        if (rev === lastRevision) return;
        lastRevision = rev;
        send(getLastBookingsEvent() ?? { reason: "sync" });
      }, POLL_MS);

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
      if (poll) clearInterval(poll);
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
