import type { WorktreeView } from "../../shared/types";
import { plural, timeAgo } from "../lib/format";
import { needsAttention } from "../lib/status";
import { AgentRow } from "./AgentRow";
import { StatusPill } from "./StatusPill";
import { WorktreeLinks } from "./WorktreeLinks";

type Props = {
  worktree: WorktreeView;
  now: number;
  selected: boolean;
  /** Opens the terminal drawer, on a given terminal or on the worktree's default one. */
  onOpen: (handle: string | null) => void;
};

export function WorktreeCard({ worktree: w, now, selected, onOpen }: Props) {
  const classes = ["card", needsAttention(w) && "attention", selected && "selected"].filter(Boolean).join(" ");

  return (
    <article className={classes} aria-label={w.displayName}>
      <button type="button" className="card-head" onClick={() => onOpen(null)}>
        <div className="card-title">
          {w.unread && <span className="unread" title="unread" />}
          <span className="repo">{w.repo}</span>
          <h2>{w.displayName}</h2>
        </div>
        <StatusPill state={w.status} />
      </button>
      <div className="branch" title={w.path}>
        {w.branch}
        {w.isMainWorktree && <span className="tag">main worktree</span>}
      </div>

      <WorktreeLinks issues={w.issues} pr={w.pr} />

      {w.comment && <div className="comment">{w.comment}</div>}

      <div className="agents">
        {w.agents.length === 0 && <div className="muted small">No agent</div>}
        {w.agents.map((a) => (
          <AgentRow key={a.paneKey} agent={a} now={now} onOpen={() => onOpen(a.handle)} />
        ))}
      </div>

      <footer className="card-foot muted small">
        {plural(w.terminals.length, "terminal")} ·{" "}
        {w.lastActivityAt ? `active ${timeAgo(w.lastActivityAt, now)} ago` : "no activity yet"}
      </footer>
    </article>
  );
}
