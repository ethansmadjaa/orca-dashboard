import { describe, expect, it, vi } from "vitest";
import type { CommandResult, RunCommand } from "./exec";
import { createOrcaClient, parseOrcaOutput } from "./orca";

const ok = (stdout: string, stderr = ""): CommandResult => ({ ok: true, stdout, stderr });

describe("parseOrcaOutput", () => {
  it("returns the result of a successful envelope", () => {
    expect(parseOrcaOutput(["repo", "list"], ok('{"ok":true,"result":{"repos":[]}}'))).toEqual({ repos: [] });
  });

  it("throws the error message of a failed envelope", () => {
    expect(() => parseOrcaOutput(["x"], ok('{"ok":false,"error":{"message":"runtime not running"}}'))).toThrow(
      "runtime not running",
    );
    expect(() => parseOrcaOutput(["x"], ok('{"ok":false,"error":"boom"}'))).toThrow("boom");
  });

  it("throws a generic message when the envelope has no result nor error", () => {
    expect(() => parseOrcaOutput(["worktree", "ps"], ok('{"ok":true}'))).toThrow("orca worktree ps failed");
  });

  it("surfaces stderr when stdout is not JSON", () => {
    expect(() => parseOrcaOutput(["worktree", "ps"], { ok: false, stdout: "", stderr: "command not found\n" })).toThrow(
      "orca worktree ps: command not found",
    );
  });
});

describe("createOrcaClient", () => {
  const setup = (result: unknown) => {
    const run = vi.fn<RunCommand>().mockResolvedValue(ok(JSON.stringify({ ok: true, result })));
    return { run, client: createOrcaClient(run, "orca-bin") };
  };

  it("lists worktrees with --json", async () => {
    const { run, client } = setup({ worktrees: [{ worktreeId: "a" }] });
    await expect(client.listWorktrees()).resolves.toEqual([{ worktreeId: "a" }]);
    expect(run).toHaveBeenCalledWith(["orca-bin", "worktree", "ps", "--json"]);
  });

  it("reads a terminal tail with a line limit", async () => {
    const { run, client } = setup({ terminal: { handle: "term_1", status: "running", tail: ["hi"] } });
    await expect(client.readTerminal("term_1", 50)).resolves.toEqual({
      handle: "term_1",
      status: "running",
      tail: ["hi"],
    });
    expect(run).toHaveBeenCalledWith([
      "orca-bin",
      "terminal",
      "read",
      "--terminal",
      "term_1",
      "--limit",
      "50",
      "--json",
    ]);
  });

  it("passes text as a single argv entry, never through a shell", async () => {
    const { run, client } = setup({});
    await client.sendToTerminal("term_1", "rm -rf / && echo $HOME");
    expect(run).toHaveBeenCalledWith([
      "orca-bin",
      "terminal",
      "send",
      "--terminal",
      "term_1",
      "--text=rm -rf / && echo $HOME",
      "--enter",
      "--json",
    ]);
  });

  it("keeps text that looks like an option attached to --text", async () => {
    const { run, client } = setup({});
    await client.sendToTerminal("term_1", "--environment=remote");
    const argv = run.mock.calls[0]![0];
    expect(argv).toContain("--text=--environment=remote");
    expect(argv).not.toContain("--environment=remote");
  });

  it("focuses a terminal", async () => {
    const { run, client } = setup({});
    await client.focusTerminal("term_1");
    expect(run).toHaveBeenCalledWith(["orca-bin", "terminal", "switch", "--terminal", "term_1", "--json"]);
  });
});
