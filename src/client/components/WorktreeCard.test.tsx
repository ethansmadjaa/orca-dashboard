// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { agentView, worktreeView } from "../../test/factories";
import { WorktreeCard } from "./WorktreeCard";

const NOW = 1_000_000;

const worktree = worktreeView({
  repo: "acme",
  displayName: "Add OAuth",
  branch: "feat/oauth",
  comment: "Blocked on infra",
  lastActivityAt: NOW - 120_000,
  issues: [
    { number: 42, title: "Sign in", state: "open", url: "https://gh/42", source: "orca" },
    { number: 7, title: null, state: null, url: null, source: "branch" },
  ],
  pr: { number: 108, title: "feat: oauth", state: "open", url: "https://gh/pr/108", checksStatus: "failure" },
  agents: [
    agentView({
      paneKey: "p1",
      state: "permission",
      title: "Implement callback",
      lastMessage: "May I run tests?",
      handle: "term_agent",
      subagents: [
        { id: "s1", state: "working", description: "Explore storage", agentType: null, startedAt: null },
        { id: "s2", state: "done", description: "Old task", agentType: null, startedAt: null },
      ],
    }),
  ],
  terminals: [{ handle: "term_agent", title: "claude", agentIdentity: "claude", lastOutputAt: null, preview: "" }],
});

function renderCard(onOpen = vi.fn()) {
  render(<WorktreeCard worktree={worktree} now={NOW} selected={false} onOpen={onOpen} />);
  return onOpen;
}

describe("WorktreeCard", () => {
  it("shows the worktree, its links and its agents", () => {
    renderCard();
    expect(screen.getByRole("heading", { name: "Add OAuth" })).toBeInTheDocument();
    expect(screen.getByText("feat/oauth")).toBeInTheDocument();
    expect(screen.getByText("Blocked on infra")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /#42\s*Sign in/ })).toHaveAttribute("href", "https://gh/42");
    expect(screen.getByRole("link", { name: /PR #108/ })).toHaveTextContent("failure");
    expect(screen.getByTitle("inferred from the branch name")).toBeInTheDocument();
    expect(screen.getByText("May I run tests?")).toBeInTheDocument();
    expect(screen.getByText(/2 subagents · 1 active/)).toBeInTheDocument();
    expect(screen.getByText("Explore storage")).toBeInTheDocument();
    expect(screen.queryByText("Old task")).not.toBeInTheDocument();
    expect(screen.getByText(/1 terminal · active 2 min ago/)).toBeInTheDocument();
  });

  it("highlights worktrees waiting on a human", () => {
    renderCard();
    expect(screen.getByRole("article", { name: "Add OAuth" })).toHaveClass("attention");
  });

  it("opens the default terminal from the header and the agent's terminal from its row", async () => {
    const onOpen = renderCard();
    await userEvent.click(screen.getByRole("button", { name: /Add OAuth/ }));
    expect(onOpen).toHaveBeenLastCalledWith(null);
    await userEvent.click(screen.getByRole("button", { name: /Implement callback/ }));
    expect(onOpen).toHaveBeenLastCalledWith("term_agent");
  });

  it("says when there is no agent", () => {
    render(<WorktreeCard worktree={worktreeView()} now={NOW} selected onOpen={vi.fn()} />);
    expect(screen.getByText("No agent")).toBeInTheDocument();
    expect(screen.getByText(/no activity yet/)).toBeInTheDocument();
  });
});
