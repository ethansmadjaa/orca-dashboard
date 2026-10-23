import { describe, expect, it, vi } from "vitest";
import { createApi, isTerminalHandle } from "./api";
import type { OrcaClient } from "./orca";

const PORT = 4317;
const ORIGIN = `http://127.0.0.1:${PORT}`;

function setup() {
  const orca = {
    readTerminal: vi
      .fn<OrcaClient["readTerminal"]>()
      .mockResolvedValue({ handle: "term_1", status: "running", tail: ["a"] }),
    sendToTerminal: vi.fn<OrcaClient["sendToTerminal"]>().mockResolvedValue(),
    focusTerminal: vi.fn<OrcaClient["focusTerminal"]>().mockResolvedValue(),
  };
  const stream = { connect: vi.fn(() => new Response("sse")) };
  const api = createApi({ orca, stream, port: PORT, terminalTailLines: 300 });
  return { api, orca, stream };
}

function get(path: string, host = `127.0.0.1:${PORT}`) {
  return new Request(`${ORIGIN}${path}`, { headers: { host } });
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { host: `127.0.0.1:${PORT}`, origin: ORIGIN, "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("isTerminalHandle", () => {
  it.each(["term_abc", "term_a-b_1"])("accepts %s", (h) => expect(isTerminalHandle(h)).toBe(true));
  it.each(["", "term_", "abc", "term_a;rm", "term_a b", 42, null])("rejects %s", (h) => {
    expect(isTerminalHandle(h)).toBe(false);
  });
});

describe("GET /api/stream", () => {
  it("connects allowed hosts", () => {
    const { api, stream } = setup();
    api.stream(get("/api/stream", `localhost:${PORT}`));
    expect(stream.connect).toHaveBeenCalledOnce();
  });

  it("rejects foreign Host headers (DNS rebinding)", () => {
    const { api, stream } = setup();
    expect(api.stream(get("/api/stream", `evil.example:${PORT}`)).status).toBe(403);
    expect(stream.connect).not.toHaveBeenCalled();
  });
});

describe("GET /api/terminal", () => {
  it("returns the terminal tail", async () => {
    const { api, orca } = setup();
    const res = await api.terminal(get("/api/terminal?handle=term_1"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ handle: "term_1", status: "running", lines: ["a"] });
    expect(orca.readTerminal).toHaveBeenCalledWith("term_1", 300);
  });

  it("validates the handle", async () => {
    const { api, orca } = setup();
    expect((await api.terminal(get("/api/terminal?handle=../etc"))).status).toBe(400);
    expect((await api.terminal(get("/api/terminal"))).status).toBe(400);
    expect(orca.readTerminal).not.toHaveBeenCalled();
  });

  it("maps Orca failures to 502", async () => {
    const { api, orca } = setup();
    orca.readTerminal.mockRejectedValue(new Error("gone"));
    const res = await api.terminal(get("/api/terminal?handle=term_1"));
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "gone" });
  });

  it("rejects foreign hosts", async () => {
    const { api } = setup();
    expect((await api.terminal(get("/api/terminal?handle=term_1", "attacker:80"))).status).toBe(403);
  });
});

describe("POST /api/send", () => {
  it("sends text to the terminal", async () => {
    const { api, orca } = setup();
    const res = await api.send(post("/api/send", { handle: "term_1", text: "yes" }));
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(orca.sendToTerminal).toHaveBeenCalledWith("term_1", "yes");
  });

  it("accepts a charset in the content type", async () => {
    const { api } = setup();
    const res = await api.send(
      post("/api/send", { handle: "term_1", text: "yes" }, { "content-type": "application/json; charset=utf-8" }),
    );
    expect(res.status).toBe(200);
  });

  it.each([
    ["a cross-site origin", { origin: "https://evil.example" }],
    ["a missing origin", { origin: "" }],
    ["a foreign host", { host: "evil.example" }],
    ["a form content type (no CORS preflight)", { "content-type": "text/plain" }],
  ])("refuses %s", async (_label, headers) => {
    const { api, orca } = setup();
    const res = await api.send(post("/api/send", { handle: "term_1", text: "yes" }, headers));
    expect(res.status).toBe(403);
    expect(orca.sendToTerminal).not.toHaveBeenCalled();
  });

  it("refuses malformed or non-object bodies", async () => {
    const { api } = setup();
    expect((await api.send(post("/api/send", "{nope"))).status).toBe(403);
    expect((await api.send(post("/api/send", "null"))).status).toBe(403);
  });

  it("validates handle and text", async () => {
    const { api, orca } = setup();
    expect((await api.send(post("/api/send", { handle: "bad", text: "x" }))).status).toBe(400);
    expect((await api.send(post("/api/send", { handle: "term_1", text: "   " }))).status).toBe(400);
    expect((await api.send(post("/api/send", { handle: "term_1", text: 3 }))).status).toBe(400);
    expect(orca.sendToTerminal).not.toHaveBeenCalled();
  });

  it("maps Orca failures to 502", async () => {
    const { api, orca } = setup();
    orca.sendToTerminal.mockRejectedValue(new Error("closed"));
    expect((await api.send(post("/api/send", { handle: "term_1", text: "x" }))).status).toBe(502);
  });
});

describe("POST /api/focus", () => {
  it("focuses the terminal in Orca", async () => {
    const { api, orca } = setup();
    const res = await api.focus(post("/api/focus", { handle: "term_1" }));
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(orca.focusTerminal).toHaveBeenCalledWith("term_1");
  });

  it("refuses cross-site requests and bad handles", async () => {
    const { api, orca } = setup();
    expect((await api.focus(post("/api/focus", { handle: "term_1" }, { origin: "https://evil.example" }))).status).toBe(
      403,
    );
    expect((await api.focus(post("/api/focus", { handle: "nope" }))).status).toBe(400);
    expect(orca.focusTerminal).not.toHaveBeenCalled();
  });
});
