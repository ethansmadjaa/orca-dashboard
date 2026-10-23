import type { Snapshot } from "../shared/types";

type Options = {
  load: () => Promise<Snapshot>;
  intervalMs: number;
  now?: () => number;
};

export type SnapshotStream = {
  /** Opens an SSE response; polling runs only while at least one client is connected. */
  connect(signal?: AbortSignal): Response;
  clientCount(): number;
};

const encoder = new TextEncoder();
const frame = (snapshot: Snapshot) => encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`);

export function createSnapshotStream({ load, intervalMs, now = Date.now }: Options): SnapshotStream {
  const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
  let last: Snapshot = { at: 0, error: null, worktrees: [] };
  // True from the moment a poll starts until the loop stops, so concurrent connects never start a second loop.
  let polling = false;

  const broadcast = (snapshot: Snapshot) => {
    const chunk = frame(snapshot);
    for (const client of clients) {
      try {
        client.enqueue(chunk);
      } catch {
        clients.delete(client);
      }
    }
  };

  const tick = async () => {
    try {
      last = await load();
    } catch (e) {
      // Keep the previous worktrees on screen and surface the error next to them.
      last = { ...last, at: now(), error: e instanceof Error ? e.message : String(e) };
    }
    broadcast(last);
    if (clients.size > 0) setTimeout(() => void tick(), intervalMs);
    else polling = false;
  };

  return {
    connect(signal) {
      let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
      const drop = () => {
        if (controller) clients.delete(controller);
      };
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          controller = c;
          clients.add(c);
          if (last.at) c.enqueue(frame(last));
          if (!polling) {
            polling = true;
            void tick();
          }
        },
        cancel: drop,
      });
      signal?.addEventListener("abort", drop);
      return new Response(body, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    },
    clientCount: () => clients.size,
  };
}
