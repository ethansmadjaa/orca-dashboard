import type { AgentView, IssueRef, IssueSource, PrRef, Snapshot, TerminalView, WorktreeView } from "../shared/types";
import type { GithubLookup } from "./github";
import type { OrcaClient } from "./orca";
import type { RawAgent, RawTerminal, RawWorktree } from "./orca-types";

// Fallback heuristics when Orca has no explicit link: `ticket-12` in a branch, "ticket #12" or "PR #34" in a prompt.
const BRANCH_TICKET = /ticket[-_]?(\d+)/i;
const PROMPT_TICKET = /ticket\s+(?:github\s+)?#?(\d+)/i;
const PROMPT_PR = /\bPR\s+#(\d+)/i;

const lower = (value: string | null | undefined) => value?.toLowerCase() ?? null;

function agentText(agent: RawAgent): string {
  return `${agent.taskTitle ?? ""} ${agent.prompt ?? ""}`;
}

/** Issues linked to a worktree, most trustworthy source first, deduplicated by number. */
export function collectIssues(worktree: RawWorktree, slug: string | null, github: GithubLookup): IssueRef[] {
  const found = new Map<number, IssueRef>();
  const add = (number: number, source: IssueSource, title: string | null = null, url: string | null = null) => {
    if (!found.has(number)) found.set(number, { number, title, state: null, url, source });
  };

  for (const item of worktree.linkedItems ?? []) {
    if (item.provider === "github" && item.type === "issue") {
      add(item.number, "orca", item.title ?? null, item.url ?? null);
    }
  }
  if (worktree.linkedIssue) add(worktree.linkedIssue, "orca");

  const fromBranch = BRANCH_TICKET.exec(`${worktree.branch} ${worktree.displayName}`);
  if (fromBranch?.[1]) add(Number(fromBranch[1]), "branch");

  for (const agent of worktree.agents ?? []) {
    const fromPrompt = PROMPT_TICKET.exec(agentText(agent));
    if (fromPrompt?.[1]) add(Number(fromPrompt[1]), "prompt");
  }

  return [...found.values()].map((issue) => {
    if (!slug) return issue;
    const gh = github("issue", slug, issue.number);
    return {
      ...issue,
      title: issue.title ?? gh?.title ?? null,
      state: gh?.state ?? null,
      url: issue.url ?? gh?.url ?? `https://github.com/${slug}/issues/${issue.number}`,
    };
  });
}

/** The worktree's pull request: Orca's link if any, otherwise the first "PR #N" mentioned to an agent. */
export function collectPr(worktree: RawWorktree, slug: string | null, github: GithubLookup): PrRef | null {
  const linked = worktree.linkedPR;
  if (linked) {
    return {
      number: linked.number,
      title: linked.title ?? null,
      state: lower(linked.state),
      url: linked.url ?? null,
      checksStatus: lower(linked.checksStatus),
    };
  }

  for (const agent of worktree.agents ?? []) {
    const match = PROMPT_PR.exec(agentText(agent));
    if (!match?.[1]) continue;
    const number = Number(match[1]);
    const gh = slug ? github("pr", slug, number) : null;
    return {
      number,
      title: gh?.title ?? null,
      state: gh?.state ?? null,
      url: gh?.url ?? (slug ? `https://github.com/${slug}/pull/${number}` : null),
      checksStatus: null,
    };
  }
  return null;
}

export function toAgentView(agent: RawAgent, handleByPane: ReadonlyMap<string, string>): AgentView {
  return {
    paneKey: agent.paneKey,
    agentType: agent.agentType,
    state: agent.state,
    title: agent.taskTitle ?? agent.displayName ?? null,
    lastMessage: agent.lastAssistantMessage ?? null,
    toolName: agent.toolName ?? null,
    stateStartedAt: agent.stateStartedAt ?? null,
    updatedAt: agent.updatedAt ?? null,
    subagents: (agent.subagents ?? []).map((sub) => ({
      id: sub.id,
      state: sub.state,
      description: sub.description ?? null,
      agentType: sub.agentType ?? null,
      startedAt: sub.startedAt ?? null,
    })),
    handle: handleByPane.get(agent.paneKey) ?? null,
  };
}

/** An agent's `paneKey` is `<tabId>:<leafId>` of the terminal it runs in. */
export function indexTerminals(terminals: RawTerminal[]) {
  const handleByPane = new Map<string, string>();
  const byWorktree = new Map<string, TerminalView[]>();
  for (const t of terminals) {
    handleByPane.set(`${t.tabId}:${t.leafId}`, t.handle);
    const list = byWorktree.get(t.worktreeId) ?? [];
    list.push({
      handle: t.handle,
      title: t.title,
      agentIdentity: t.agentIdentity ?? null,
      lastOutputAt: t.lastOutputAt ?? null,
      preview: t.preview ?? "",
    });
    byWorktree.set(t.worktreeId, list);
  }
  return { handleByPane, byWorktree };
}

type SnapshotInput = {
  worktrees: RawWorktree[];
  terminals: RawTerminal[];
  slugs: ReadonlyMap<string, string>;
  github: GithubLookup;
  at: number;
};

export function buildSnapshot({ worktrees, terminals, slugs, github, at }: SnapshotInput): Snapshot {
  const { handleByPane, byWorktree } = indexTerminals(terminals);

  const views: WorktreeView[] = worktrees
    .filter((w) => !w.isArchived)
    .map((w) => {
      const slug = slugs.get(w.repoId) ?? null;
      return {
        id: w.worktreeId,
        repo: w.repo,
        repoSlug: slug,
        displayName: w.displayName,
        branch: w.branch.replace(/^refs\/heads\//, ""),
        path: w.path,
        status: w.status,
        workspaceStatus: w.workspaceStatus ?? null,
        comment: w.comment ?? "",
        unread: w.unread ?? false,
        isMainWorktree: w.isMainWorktree,
        lastActivityAt: w.lastActivityAt ?? null,
        lastOutputAt: w.lastOutputAt ?? null,
        issues: collectIssues(w, slug, github),
        pr: collectPr(w, slug, github),
        agents: (w.agents ?? []).map((a) => toAgentView(a, handleByPane)),
        terminals: byWorktree.get(w.worktreeId) ?? [],
      };
    });

  return { at, error: null, worktrees: views };
}

type LoaderDeps = {
  orca: Pick<OrcaClient, "listWorktrees" | "listTerminals">;
  repoSlugs: () => Promise<ReadonlyMap<string, string>>;
  github: GithubLookup;
  now?: () => number;
};

export function createSnapshotLoader({ orca, repoSlugs, github, now = Date.now }: LoaderDeps) {
  return async (): Promise<Snapshot> => {
    const [worktrees, terminals, slugs] = await Promise.all([orca.listWorktrees(), orca.listTerminals(), repoSlugs()]);
    return buildSnapshot({ worktrees, terminals, slugs, github, at: now() });
  };
}
