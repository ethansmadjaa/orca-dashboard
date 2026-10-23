import type { OrcaClient } from "./orca";
import type { RawRepo, RawTerminal, RawWorktree } from "./orca-types";

// Fake Orca data for `bun run demo`: lets you work on the UI without Orca installed.

const APP_REPO = "demo-app";
const DOCS_REPO = "demo-docs";

function worktrees(now: number): RawWorktree[] {
  const min = 60_000;
  return [
    {
      worktreeId: "wt-auth",
      repoId: APP_REPO,
      repo: "acme-app",
      path: "/tmp/acme-app/ticket-42-oauth",
      branch: "refs/heads/feat/ticket-42-oauth",
      displayName: "Add GitHub OAuth login",
      isArchived: false,
      isMainWorktree: false,
      status: "working",
      workspaceStatus: "in-progress",
      lastActivityAt: now - 20_000,
      linkedItems: [
        {
          provider: "github",
          type: "issue",
          number: 42,
          title: "Sign in with GitHub",
          url: "https://github.com/acme/acme-app/issues/42",
        },
      ],
      comment: "Waiting on the callback URL from infra",
      unread: true,
      agents: [
        {
          paneKey: "tab-1:leaf-1",
          state: "working",
          agentType: "claude",
          taskTitle: "Implement OAuth callback route",
          lastAssistantMessage: "Wiring the token exchange, then adding tests for the error paths.",
          toolName: "Edit",
          updatedAt: now - 20_000,
          subagents: [
            { id: "sub-1", state: "working", description: "Explore session storage", agentType: "Explore" },
            { id: "sub-2", state: "done", description: "Read OAuth docs" },
          ],
        },
      ],
    },
    {
      worktreeId: "wt-billing",
      repoId: APP_REPO,
      repo: "acme-app",
      path: "/tmp/acme-app/fix-invoice-rounding",
      branch: "refs/heads/fix/invoice-rounding",
      displayName: "Fix invoice rounding",
      isArchived: false,
      isMainWorktree: false,
      status: "waiting",
      lastActivityAt: now - 3 * min,
      linkedPR: {
        number: 108,
        state: "OPEN",
        title: "fix: round invoice totals half-even",
        url: "https://github.com/acme/acme-app/pull/108",
        checksStatus: "failure",
      },
      agents: [
        {
          paneKey: "tab-2:leaf-1",
          state: "permission",
          agentType: "codex",
          taskTitle: "Fix invoice rounding",
          lastAssistantMessage: "May I run the full billing test suite? It takes about 4 minutes.",
          toolName: "Bash",
          updatedAt: now - 3 * min,
        },
      ],
    },
    {
      worktreeId: "wt-docs",
      repoId: DOCS_REPO,
      repo: "acme-docs",
      path: "/tmp/acme-docs/main",
      branch: "refs/heads/main",
      displayName: "acme-docs",
      isArchived: false,
      isMainWorktree: true,
      status: "done",
      lastActivityAt: now - 95 * min,
      agents: [
        {
          paneKey: "tab-3:leaf-1",
          state: "done",
          agentType: "claude",
          prompt: "Update the API reference for ticket #7",
          lastAssistantMessage: "Done: regenerated the reference and fixed 3 broken links.",
          updatedAt: now - 95 * min,
        },
      ],
    },
  ];
}

const terminals: RawTerminal[] = [
  {
    handle: "term_auth",
    worktreeId: "wt-auth",
    tabId: "tab-1",
    leafId: "leaf-1",
    title: "claude",
    agentIdentity: "claude",
  },
  { handle: "term_auth_dev", worktreeId: "wt-auth", tabId: "tab-1", leafId: "leaf-2", title: "bun dev" },
  {
    handle: "term_billing",
    worktreeId: "wt-billing",
    tabId: "tab-2",
    leafId: "leaf-1",
    title: "codex",
    agentIdentity: "codex",
  },
  {
    handle: "term_docs",
    worktreeId: "wt-docs",
    tabId: "tab-3",
    leafId: "leaf-1",
    title: "claude",
    agentIdentity: "claude",
  },
];

const repos: RawRepo[] = [
  { id: APP_REPO, gitRemoteIdentity: { canonicalKey: "github.com/acme/acme-app" } },
  { id: DOCS_REPO, gitRemoteIdentity: { canonicalKey: "github.com/acme/acme-docs" } },
];

export function createDemoOrcaClient(now: () => number = Date.now): OrcaClient {
  return {
    listWorktrees: () => Promise.resolve(worktrees(now())),
    listTerminals: () => Promise.resolve(terminals),
    listRepos: () => Promise.resolve(repos),
    readTerminal: (handle) =>
      Promise.resolve({
        handle,
        status: "running",
        tail: [`$ demo terminal ${handle}`, "\x1b[32m✓\x1b[0m 42 tests passed", "Waiting for input…"],
      }),
    sendToTerminal: () => Promise.resolve(),
    focusTerminal: () => Promise.resolve(),
  };
}
