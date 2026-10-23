import { describe, expect, it, vi } from "vitest";
import type { RunCommand } from "./exec";
import { createGithubLookup } from "./github";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(stdout = '{"title":"Fix login","state":"OPEN","url":"https://github.com/o/r/issues/1"}', ok = true) {
  let clock = 1_000;
  const run = vi.fn<RunCommand>().mockResolvedValue({ ok, stdout, stderr: "" });
  const lookup = createGithubLookup({ run, ttlMs: 100, now: () => clock });
  return { run, lookup, advance: (ms: number) => (clock += ms) };
}

describe("createGithubLookup", () => {
  it("returns null on a cold cache, then the fetched item with a lowercase state", async () => {
    const { run, lookup } = setup();
    expect(lookup("issue", "o/r", 1)).toBeNull();
    await flush();
    expect(lookup("issue", "o/r", 1)).toEqual({
      title: "Fix login",
      state: "open",
      url: "https://github.com/o/r/issues/1",
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(["gh", "issue", "view", "1", "-R", "o/r", "--json", "title,state,url"]);
  });

  it("does not start a second request while one is in flight", () => {
    const { run, lookup } = setup();
    lookup("pr", "o/r", 2);
    lookup("pr", "o/r", 2);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("serves the stale value while refreshing after the TTL", async () => {
    const { run, lookup, advance } = setup();
    lookup("issue", "o/r", 1);
    await flush();
    advance(150);
    expect(lookup("issue", "o/r", 1)?.title).toBe("Fix login");
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("caches failures as null until the TTL expires", async () => {
    const { run, lookup } = setup("", false);
    lookup("issue", "o/r", 1);
    await flush();
    expect(lookup("issue", "o/r", 1)).toBeNull();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("survives malformed gh output and a crashing command", async () => {
    const malformed = setup("not json");
    malformed.lookup("issue", "o/r", 1);
    await flush();
    expect(malformed.lookup("issue", "o/r", 1)).toBeNull();

    const run = vi.fn<RunCommand>().mockRejectedValue(new Error("ENOENT"));
    const lookup = createGithubLookup({ run, ttlMs: 100 });
    lookup("issue", "o/r", 1);
    await flush();
    expect(lookup("issue", "o/r", 1)).toBeNull();
    expect(run).toHaveBeenCalledTimes(1);
  });
});
