import { describe, expect, it } from "vitest";
import { agentView, worktreeView } from "../../test/factories";
import { countAgentsByTone, isBusy, needsAttention, priority, tone } from "./status";

describe("tone", () => {
  it.each([
    ["working", "work"],
    ["Thinking", "work"],
    ["permission", "wait"],
    ["needs-input", "wait"],
    ["DONE", "done"],
    ["crashed", "error"],
    ["active", "idle"],
    ["something-new", "idle"],
  ])("%s → %s", (state, expected) => {
    expect(tone(state)).toBe(expected);
  });
});

describe("worktree status", () => {
  const waiting = worktreeView({ agents: [agentView({ state: "working" }), agentView({ state: "permission" })] });
  const busy = worktreeView({ status: "working" });
  const quiet = worktreeView({ status: "done", agents: [agentView({ state: "done" })] });

  it("needs attention when the worktree or any agent waits", () => {
    expect(needsAttention(waiting)).toBe(true);
    expect(needsAttention(worktreeView({ status: "waiting" }))).toBe(true);
    expect(needsAttention(busy)).toBe(false);
  });

  it("is busy when the worktree or any agent works", () => {
    expect(isBusy(busy)).toBe(true);
    expect(isBusy(waiting)).toBe(true);
    expect(isBusy(quiet)).toBe(false);
  });

  it("ranks blocked before busy before the rest", () => {
    expect([quiet, busy, waiting].map(priority)).toEqual([2, 1, 0]);
  });
});

describe("countAgentsByTone", () => {
  it("counts every tone", () => {
    const agents = ["working", "running", "waiting", "done", "huh"].map((state) => agentView({ state }));
    expect(countAgentsByTone(agents)).toEqual({ work: 2, wait: 1, done: 1, idle: 1, error: 0 });
  });
});
