import type { RawAgent, RawTerminal, RawWorktree } from "../server/orca-types";
import type { AgentView, WorktreeView } from "../shared/types";

export function rawWorktree(overrides: Partial<RawWorktree> = {}): RawWorktree {
  return {
    worktreeId: "wt-1",
    repoId: "repo-1",
    repo: "acme",
    path: "/tmp/acme",
    branch: "refs/heads/feature",
    displayName: "Feature",
    isArchived: false,
    isMainWorktree: false,
    status: "idle",
    ...overrides,
  };
}

export function rawAgent(overrides: Partial<RawAgent> = {}): RawAgent {
  return { paneKey: "tab-1:leaf-1", state: "working", agentType: "claude", ...overrides };
}

export function rawTerminal(overrides: Partial<RawTerminal> = {}): RawTerminal {
  return { handle: "term_1", worktreeId: "wt-1", tabId: "tab-1", leafId: "leaf-1", title: "claude", ...overrides };
}

export function agentView(overrides: Partial<AgentView> = {}): AgentView {
  return {
    paneKey: "tab-1:leaf-1",
    agentType: "claude",
    state: "idle",
    title: null,
    lastMessage: null,
    toolName: null,
    stateStartedAt: null,
    updatedAt: null,
    subagents: [],
    handle: "term_1",
    ...overrides,
  };
}

export function worktreeView(overrides: Partial<WorktreeView> = {}): WorktreeView {
  return {
    id: "wt-1",
    repo: "acme",
    repoSlug: "acme/acme",
    displayName: "Feature",
    branch: "feature",
    path: "/tmp/acme",
    status: "idle",
    workspaceStatus: null,
    comment: "",
    unread: false,
    isMainWorktree: false,
    lastActivityAt: null,
    lastOutputAt: null,
    issues: [],
    pr: null,
    agents: [],
    terminals: [],
    ...overrides,
  };
}
