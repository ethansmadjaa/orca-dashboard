import { useCallback, useMemo, useState } from "react";
import { TerminalDrawer } from "./components/TerminalDrawer";
import { Toolbar } from "./components/Toolbar";
import { WorktreeCard } from "./components/WorktreeCard";
import { useNow } from "./hooks/useNow";
import { useSnapshot } from "./hooks/useSnapshot";
import { type Filters, filterWorktrees, repoNames } from "./lib/filter";
import { countAgentsByTone } from "./lib/status";

type Opened = { worktreeId: string; handle: string | null };

export function App() {
  const { snapshot, connected } = useSnapshot();
  const now = useNow(5_000);
  const [filters, setFilters] = useState<Filters>({ repo: null, activeOnly: false, query: "" });
  const [opened, setOpened] = useState<Opened | null>(null);
  const close = useCallback(() => setOpened(null), []);

  const worktrees = useMemo(() => snapshot?.worktrees ?? [], [snapshot]);
  const repos = useMemo(() => repoNames(worktrees), [worktrees]);
  // A repo filter whose repo vanished from the data would hide everything behind "All repos".
  const effectiveFilters = useMemo(
    () => (filters.repo && !repos.includes(filters.repo) ? { ...filters, repo: null } : filters),
    [filters, repos],
  );
  const visible = useMemo(() => filterWorktrees(worktrees, effectiveFilters), [worktrees, effectiveFilters]);
  const counts = useMemo(() => countAgentsByTone(worktrees.flatMap((w) => w.agents)), [worktrees]);
  // Looked up on every snapshot so the drawer follows live updates.
  const openedWorktree = opened ? worktrees.find((w) => w.id === opened.worktreeId) : undefined;
  // The worktree is gone: close for good, so it does not pop back open if the worktree reappears.
  if (opened && snapshot && !openedWorktree) setOpened(null);

  return (
    <div className={`app ${openedWorktree ? "with-drawer" : ""}`}>
      <main className="main">
        <Toolbar
          snapshot={snapshot}
          connected={connected}
          now={now}
          counts={counts}
          repos={repos}
          filters={effectiveFilters}
          onFiltersChange={setFilters}
        />

        {snapshot?.error && (
          <div className="error banner" role="alert">
            {snapshot.error}
          </div>
        )}
        {!snapshot && <div className="muted empty">Connecting to Orca…</div>}
        {snapshot && !snapshot.error && visible.length === 0 && (
          <div className="muted empty">{worktrees.length ? "No worktree matches the filters" : "No worktree"}</div>
        )}

        <section className="grid">
          {visible.map((w) => (
            <WorktreeCard
              key={w.id}
              worktree={w}
              now={now}
              selected={opened?.worktreeId === w.id}
              onOpen={(handle) => setOpened({ worktreeId: w.id, handle })}
            />
          ))}
        </section>
      </main>

      {opened && openedWorktree && (
        <TerminalDrawer
          key={`${opened.worktreeId}:${opened.handle ?? ""}`}
          worktree={openedWorktree}
          initialHandle={opened.handle}
          onClose={close}
        />
      )}
    </div>
  );
}
