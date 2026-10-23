import type { ApiResult, TerminalTail } from "../shared/types";
import type { OrcaClient } from "./orca";
import type { SnapshotStream } from "./stream";

const TERMINAL_HANDLE = /^term_[\w-]+$/;

export function isTerminalHandle(value: unknown): value is string {
  return typeof value === "string" && TERMINAL_HANDLE.test(value);
}

/** The `host:port` pairs the dashboard answers to. Anything else is a DNS-rebinding attempt. */
export function allowedHosts(port: number): Set<string> {
  return new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
}

const json = (body: ApiResult | TerminalTail, status = 200) => Response.json(body, { status });
const fail = (status: number, error: string) => json({ ok: false, error }, status);
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Deps = {
  orca: Pick<OrcaClient, "readTerminal" | "sendToTerminal" | "focusTerminal">;
  stream: Pick<SnapshotStream, "connect">;
  port: number;
  terminalTailLines: number;
};

export function createApi({ orca, stream, port, terminalTailLines }: Deps) {
  const hosts = allowedHosts(port);
  const origins = new Set([...hosts].map((h) => `http://${h}`));

  const fromDashboardHost = (req: Request) => hosts.has(req.headers.get("host") ?? "");

  // Mutations must come from this page: blocks CSRF from any other site the browser has open.
  const readMutation = async (req: Request): Promise<Record<string, unknown> | null> => {
    if (!fromDashboardHost(req) || !origins.has(req.headers.get("origin") ?? "")) return null;
    if (req.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") return null;
    try {
      const body: unknown = await req.json();
      return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };

  return {
    stream: (req: Request): Response => {
      if (!fromDashboardHost(req)) return fail(403, "forbidden");
      return stream.connect(req.signal);
    },

    terminal: async (req: Request): Promise<Response> => {
      if (!fromDashboardHost(req)) return fail(403, "forbidden");
      const handle = new URL(req.url).searchParams.get("handle");
      if (!isTerminalHandle(handle)) return fail(400, "invalid terminal handle");
      try {
        const t = await orca.readTerminal(handle, terminalTailLines);
        return json({ handle: t.handle, status: t.status, lines: t.tail });
      } catch (e) {
        return fail(502, message(e));
      }
    },

    send: async (req: Request): Promise<Response> => {
      const body = await readMutation(req);
      if (!body) return fail(403, "forbidden");
      const { handle, text } = body;
      if (!isTerminalHandle(handle)) return fail(400, "invalid terminal handle");
      if (typeof text !== "string" || !text.trim()) return fail(400, "empty text");
      try {
        await orca.sendToTerminal(handle, text);
        return json({ ok: true });
      } catch (e) {
        return fail(502, message(e));
      }
    },

    focus: async (req: Request): Promise<Response> => {
      const body = await readMutation(req);
      if (!body) return fail(403, "forbidden");
      if (!isTerminalHandle(body.handle)) return fail(400, "invalid terminal handle");
      try {
        await orca.focusTerminal(body.handle);
        return json({ ok: true });
      } catch (e) {
        return fail(502, message(e));
      }
    },
  };
}

export type Api = ReturnType<typeof createApi>;
