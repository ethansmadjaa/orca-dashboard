// Wire format between the server and the UI: already enriched, flattened and normalized
// (GitHub states are lowercase, branch names have no `refs/heads/` prefix).

export type IssueSource = "orca" | "branch" | "prompt";

export type IssueRef = {
  number: number;
  title: string | null;
  state: string | null;
  url: string | null;
  source: IssueSource;
};

export type PrRef = {
  number: number;
  title: string | null;
  state: string | null;
  url: string | null;
  checksStatus: string | null;
};

export type SubagentView = {
  id: string;
  state: string;
  description: string | null;
  agentType: string | null;
  startedAt: number | null;
};

export type AgentView = {
  paneKey: string;
  agentType: string;
  state: string;
  title: string | null;
  lastMessage: string | null;
  toolName: string | null;
  stateStartedAt: number | null;
  updatedAt: number | null;
  subagents: SubagentView[];
  handle: string | null;
};

export type TerminalView = {
  handle: string;
  title: string;
  agentIdentity: string | null;
  lastOutputAt: number | null;
  preview: string;
};

export type WorktreeView = {
  id: string;
  repo: string;
  repoSlug: string | null;
  displayName: string;
  branch: string;
  path: string;
  status: string;
  workspaceStatus: string | null;
  comment: string;
  unread: boolean;
  isMainWorktree: boolean;
  lastActivityAt: number | null;
  lastOutputAt: number | null;
  issues: IssueRef[];
  pr: PrRef | null;
  agents: AgentView[];
  terminals: TerminalView[];
};

export type Snapshot = {
  at: number;
  error: string | null;
  worktrees: WorktreeView[];
};

export type TerminalTail = {
  handle: string;
  status: string;
  lines: string[];
};

export type ApiResult = { ok: true } | { ok: false; error: string };
