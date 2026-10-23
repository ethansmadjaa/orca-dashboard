import { describe, expect, it, vi } from "vitest";
import { rawAgent, rawTerminal, rawWorktree } from "../test/factories";
import type { GithubLookup } from "./github";
import { buildSnapshot, collectIssues, collectPr, createSnapshotLoader, indexTerminals, toAgentView } from "./snapshot";

const noGithub: GithubLookup = () => null;

describe("collectIssues", () => {
  it("prefers Orca links, then the branch, then agent prompts, without duplicates", () => {
    const w = rawWorktree({
      branch: "refs/heads/ticket-12-login",
      linkedItems: [
        { provider: "github", type: "issue", number: 7, title: "Linked", url: "https://x/7" },
        { provider: "linear", type: "issue", number: 99 },
        { provider: "github", type: "pr", number: 8 },
      ],
      linkedIssue: 7,
      agents: [rawAgent({ prompt: "Work on ticket github #30" }), rawAgent({ taskTitle: "Ticket 12 again" })],
    });

    const issues = collectIssues(w, null, noGithub);

    expect(issues.map((i) => [i.number, i.source])).toEqual([
      [7, "orca"],
      [12, "branch"],
      [30, "prompt"],
    ]);
    expect(issues[0]).toMatchObject({ title: "Linked", url: "https://x/7", state: null });
  });

  it("enriches issues from GitHub when the repo is on GitHub", () => {
    const github = vi.fn<GithubLookup>().mockReturnValue({ title: "From gh", state: "closed", url: "https://gh/12" });
    const [issue] = collectIssues(rawWorktree({ linkedIssue: 12 }), "acme/app", github);
    expect(github).toHaveBeenCalledWith("issue", "acme/app", 12);
    expect(issue).toEqual({ number: 12, title: "From gh", state: "closed", url: "https://gh/12", source: "orca" });
  });

  it("falls back to a GitHub URL built from the slug while the lookup is cold", () => {
    const [issue] = collectIssues(rawWorktree({ linkedIssue: 3 }), "acme/app", noGithub);
    expect(issue?.url).toBe("https://github.com/acme/app/issues/3");
  });

  it("returns nothing when no source mentions an issue", () => {
    expect(collectIssues(rawWorktree(), "acme/app", noGithub)).toEqual([]);
  });
});

describe("collectPr", () => {
  it("uses Orca's linked PR and lowercases its states", () => {
    const pr = collectPr(
      rawWorktree({ linkedPR: { number: 5, state: "MERGED", title: "Ship it", url: "u", checksStatus: "SUCCESS" } }),
      null,
      noGithub,
    );
    expect(pr).toEqual({ number: 5, title: "Ship it", state: "merged", url: "u", checksStatus: "success" });
  });

  it("falls back to the first 'PR #N' mentioned to an agent", () => {
    const github = vi.fn<GithubLookup>().mockReturnValue({ title: "Fix", state: "open", url: "https://gh/pr/34" });
    const w = rawWorktree({ agents: [rawAgent({ prompt: "nothing" }), rawAgent({ prompt: "Review PR #34 please" })] });
    expect(collectPr(w, "acme/app", github)).toEqual({
      number: 34,
      title: "Fix",
      state: "open",
      url: "https://gh/pr/34",
      checksStatus: null,
    });
  });

  it("has no URL for an inferred PR outside GitHub", () => {
    const w = rawWorktree({ agents: [rawAgent({ taskTitle: "PR #9" })] });
    expect(collectPr(w, null, noGithub)).toMatchObject({ number: 9, url: null });
  });

  it("returns null without any PR", () => {
    expect(collectPr(rawWorktree({ agents: [rawAgent()] }), null, noGithub)).toBeNull();
  });
});

describe("toAgentView", () => {
  it("flattens optional fields and resolves the terminal handle", () => {
    const view = toAgentView(
      rawAgent({ displayName: "Claude", subagents: [{ id: "s1", state: "working" }] }),
      new Map([["tab-1:leaf-1", "term_9"]]),
    );
    expect(view).toEqual({
      paneKey: "tab-1:leaf-1",
      agentType: "claude",
      state: "working",
      title: "Claude",
      lastMessage: null,
      toolName: null,
      stateStartedAt: null,
      updatedAt: null,
      subagents: [{ id: "s1", state: "working", description: null, agentType: null, startedAt: null }],
      handle: "term_9",
    });
  });

  it("prefers the task title over the display name", () => {
    expect(toAgentView(rawAgent({ taskTitle: "Task", displayName: "Name" }), new Map()).title).toBe("Task");
  });
});

describe("indexTerminals", () => {
  it("indexes handles by pane and groups terminals by worktree", () => {
    const { handleByPane, byWorktree } = indexTerminals([
      rawTerminal({ handle: "term_a", worktreeId: "w1", tabId: "t", leafId: "1" }),
      rawTerminal({ handle: "term_b", worktreeId: "w1", tabId: "t", leafId: "2", agentIdentity: "codex" }),
      rawTerminal({ handle: "term_c", worktreeId: "w2", tabId: "u", leafId: "1" }),
    ]);
    expect(handleByPane.get("t:2")).toBe("term_b");
    expect(byWorktree.get("w1")?.map((t) => t.handle)).toEqual(["term_a", "term_b"]);
    expect(byWorktree.get("w1")?.[1]).toMatchObject({ agentIdentity: "codex", preview: "", lastOutputAt: null });
  });
});

describe("buildSnapshot", () => {
  it("drops archived worktrees, strips refs/heads/ and wires agents to terminals", () => {
    const snapshot = buildSnapshot({
      worktrees: [
        rawWorktree({ worktreeId: "w1", repoId: "r1", agents: [rawAgent({ paneKey: "t:1" })] }),
        rawWorktree({ worktreeId: "w2", isArchived: true }),
      ],
      terminals: [rawTerminal({ handle: "term_x", worktreeId: "w1", tabId: "t", leafId: "1" })],
      slugs: new Map([["r1", "acme/app"]]),
      github: noGithub,
      at: 42,
    });

    expect(snapshot.at).toBe(42);
    expect(snapshot.error).toBeNull();
    expect(snapshot.worktrees).toHaveLength(1);
    const [w] = snapshot.worktrees;
    expect(w).toMatchObject({ id: "w1", repoSlug: "acme/app", branch: "feature", comment: "", unread: false });
    expect(w?.agents[0]?.handle).toBe("term_x");
    expect(w?.terminals.map((t) => t.handle)).toEqual(["term_x"]);
  });
});

describe("createSnapshotLoader", () => {
  it("queries Orca in parallel and builds a snapshot", async () => {
    const load = createSnapshotLoader({
      orca: {
        listWorktrees: () => Promise.resolve([rawWorktree()]),
        listTerminals: () => Promise.resolve([]),
      },
      repoSlugs: () => Promise.resolve(new Map()),
      github: noGithub,
      now: () => 7,
    });
    const snapshot = await load();
    expect(snapshot.at).toBe(7);
    expect(snapshot.worktrees).toHaveLength(1);
  });
});
