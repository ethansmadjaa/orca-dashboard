import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Snapshot } from "../shared/types";
import { createSnapshotStream } from "./stream";

const snapshot = (at: number): Snapshot => ({ at, error: null, worktrees: [] });

async function readFrame(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<Snapshot> {
  const { value } = await reader.read();
  const text = new TextDecoder().decode(value);
  expect(text).toMatch(/^data: .*\n\n$/);
  return JSON.parse(text.slice("data: ".length)) as Snapshot;
}

describe("createSnapshotStream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("responds with an SSE stream and pushes the first snapshot", async () => {
    const stream = createSnapshotStream({ load: () => Promise.resolve(snapshot(1)), intervalMs: 1_000 });
    const res = stream.connect();
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    const reader = res.body!.getReader();
    await expect(readFrame(reader)).resolves.toEqual(snapshot(1));
    await reader.cancel();
  });

  it("runs a single polling loop even when clients connect at the same time", async () => {
    let at = 0;
    const load = vi.fn(() => Promise.resolve(snapshot(++at)));
    const stream = createSnapshotStream({ load, intervalMs: 1_000 });

    const a = stream.connect().body!.getReader();
    const b = stream.connect().body!.getReader();
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3_000);
    expect(load).toHaveBeenCalledTimes(4);
    await a.cancel();
    await b.cancel();
  });

  it("stops polling once the last client leaves, and resumes on reconnect", async () => {
    const load = vi.fn(() => Promise.resolve(snapshot(Date.now())));
    const stream = createSnapshotStream({ load, intervalMs: 1_000 });
    const controller = new AbortController();

    stream.connect(controller.signal);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    expect(stream.clientCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(load).toHaveBeenCalledTimes(2);

    const reader = stream.connect().body!.getReader();
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(3);
    await reader.cancel();
  });

  it("replays the last snapshot to a new client immediately", async () => {
    const stream = createSnapshotStream({ load: () => Promise.resolve(snapshot(5)), intervalMs: 1_000 });
    const first = stream.connect().body!.getReader();
    await readFrame(first);

    const second = stream.connect().body!.getReader();
    await expect(readFrame(second)).resolves.toEqual(snapshot(5));
    await first.cancel();
    await second.cancel();
  });

  it("keeps the previous worktrees and reports the error when a load fails", async () => {
    const previous: Snapshot = { at: 1, error: null, worktrees: [{ id: "w" } as Snapshot["worktrees"][number]] };
    const load = vi
      .fn<() => Promise<Snapshot>>()
      .mockResolvedValueOnce(previous)
      .mockRejectedValueOnce(new Error("orca down"));
    const stream = createSnapshotStream({ load, intervalMs: 1_000, now: () => 99 });

    const reader = stream.connect().body!.getReader();
    await readFrame(reader);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(readFrame(reader)).resolves.toEqual({ at: 99, error: "orca down", worktrees: previous.worktrees });
    await reader.cancel();
  });
});
