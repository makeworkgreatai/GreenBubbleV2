import { eventBus } from "@/lib/events";
import type { DashboardEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          doCleanup();
        }
      }, 30000);

      function onEvent(event: DashboardEvent) {
        try {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          doCleanup();
        }
      }

      function doCleanup() {
        clearInterval(heartbeat);
        eventBus.removeListener("dashboard", onEvent);
      }

      cleanup = doCleanup;
      eventBus.on("dashboard", onEvent);

      // Send initial connection confirmation
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
