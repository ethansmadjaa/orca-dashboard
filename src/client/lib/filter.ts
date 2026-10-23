import type { WorktreeView } from "../../shared/types";
import { isBusy, needsAttention, priority } from "./status";

export type Filters = {
  repo: string | null;
  activeOnly: boolean;
  query: string;
};

function searchText(w: WorktreeView): string {
  return [
    w.displayName,
    w.branch,
    w.comment,
    ...w.issues.map((i) => `#${i.number} ${i.title ?? ""}`),
    w.pr ? `#${w.pr.number} ${w.pr.title ?? ""}` : "",
    ...w.agents.map((a) => a.title ?? ""),
  ]
    .join(" ")
    .toLowerCase();
}

/** Applies the toolbar filters, then sorts by priority and most recent activity. */
export function filterWorktrees(worktrees: WorktreeView[], { repo, activeOnly, query }: Filters): WorktreeView[] {
  const q = query.trim().toLowerCase();
  return worktrees
    .filter((w) => repo === null || w.repo === repo)
    .filter((w) => !activeOnly || needsAttention(w) || isBusy(w))
    .filter((w) => !q || searchText(w).includes(q))
    .sort((a, b) => priority(a) - priority(b) || (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0));
}

export function repoNames(worktrees: WorktreeView[]): string[] {
  return [...new Set(worktrees.map((w) => w.repo))].sort();
}
