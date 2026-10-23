// Raw shapes returned by `orca … --json`. Only the fields the dashboard reads are declared.

export type RawSubagent = {
  id: string;
  state: string;
  startedAt?: number;
  agentType?: string;
  description?: string;
};

export type RawAgent = {
  paneKey: string;
  state: string;
  agentType: string;
  prompt?: string | null;
  taskTitle?: string | null;
  displayName?: string | null;
  lastAssistantMessage?: string | null;
  toolName?: string | null;
  stateStartedAt?: number;
  updatedAt?: number;
  subagents?: RawSubagent[];
};

export type RawLinkedItem = {
  provider: string;
  type: string;
  number: number;
  title?: string;
  url?: string;
};

export type RawLinkedPr = {
  number: number;
  state?: string;
  title?: string;
  url?: string;
  checksStatus?: string;
};

export type RawWorktree = {
  worktreeId: string;
  repoId: string;
  repo: string;
  path: string;
  branch: string;
  displayName: string;
  isArchived: boolean;
  isMainWorktree: boolean;
  workspaceStatus?: string | null;
  lastActivityAt?: number;
  lastOutputAt?: number;
  linkedIssue?: number | null;
  linkedPR?: RawLinkedPr | null;
  linkedItems?: RawLinkedItem[];
  comment?: string;
  unread?: boolean;
  status: string;
  agents?: RawAgent[];
};

export type RawTerminal = {
  handle: string;
  worktreeId: string;
  tabId: string;
  leafId: string;
  title: string;
  lastOutputAt?: number;
  preview?: string;
  agentIdentity?: string | null;
};

export type RawRepo = {
  id: string;
  gitRemoteIdentity?: { canonicalKey?: string } | null;
};

export type RawTerminalRead = {
  handle: string;
  status: string;
  tail: string[];
};
