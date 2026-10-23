import type { ApiResult, TerminalTail } from "../../shared/types";

const describe = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function postJson(path: string, body: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as ApiResult;
  } catch (e) {
    return { ok: false, error: describe(e) };
  }
}

export const sendToTerminal = (handle: string, text: string) => postJson("/api/send", { handle, text });

export const focusTerminal = (handle: string) => postJson("/api/focus", { handle });

export async function fetchTerminalTail(handle: string): Promise<TerminalTail> {
  const res = await fetch(`/api/terminal?handle=${encodeURIComponent(handle)}`);
  const body = (await res.json()) as TerminalTail | { ok: false; error: string };
  if ("error" in body) throw new Error(body.error);
  return body;
}
