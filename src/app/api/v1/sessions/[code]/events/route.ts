// GET /api/v1/sessions/{code}/events — Server-Sent Events (PRD §4.7). Sends `ready` with the current version,
// then `changed` whenever Session.version moves. Events carry no question data; clients refetch.
import { toErrorResponse } from "@/lib/api/http";
import { getSessionVersion } from "@/lib/server/realtime";
import { findSessionByCode, requireParticipant } from "@/lib/server/services/access";

// Vercel keeps the function alive for the stream; the browser's EventSource reconnects when it closes.
export const maxDuration = 300;

const STREAM_LIFETIME_MS = 240_000;
const HEARTBEAT_MS = 15_000;

export async function GET(req: Request, { params }: RouteContext<"/api/v1/sessions/[code]/events">): Promise<Response> {
  try {
    const session = await findSessionByCode((await params).code);
    await requireParticipant(req, session, new Date());
    return new Response(eventStream(session.id, req.signal), {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

function eventStream(sessionId: string, signal: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const pollMs = Number(process.env.SSE_POLL_MS ?? 1000);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  return new ReadableStream({
    async start(controller) {
      const send = (text: string) => {
        if (!closed) controller.enqueue(encoder.encode(text));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        controller.close();
      };
      signal.addEventListener("abort", close);

      let version = await getSessionVersion(sessionId);
      send(`retry: 2000\nevent: ready\ndata: ${JSON.stringify({ version })}\n\n`);
      const startedAt = Date.now();
      let lastBeat = startedAt;

      const tick = async () => {
        if (closed) return;
        if (Date.now() - startedAt > STREAM_LIFETIME_MS) return close();
        try {
          const current = await getSessionVersion(sessionId);
          if (current !== version) {
            version = current;
            send(`event: changed\ndata: ${JSON.stringify({ version })}\n\n`);
          } else if (Date.now() - lastBeat > HEARTBEAT_MS) {
            lastBeat = Date.now();
            send(": ping\n\n");
          }
        } catch {
          return close();
        }
        timer = setTimeout(tick, pollMs);
      };
      timer = setTimeout(tick, pollMs);
    },
    cancel() {
      closed = true;
      clearTimeout(timer);
    },
  });
}
