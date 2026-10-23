import type { Snapshot } from "../../shared/types";
import type { Filters } from "../lib/filter";
import { plural, timeAgo } from "../lib/format";
import type { Tone } from "../lib/status";

type Props = {
  snapshot: Snapshot | null;
  connected: boolean;
  now: number;
  counts: Record<Tone, number>;
  repos: string[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

export function Toolbar({ snapshot, connected, now, counts, repos, filters, onFiltersChange }: Props) {
  const update = (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch });

  return (
    <header className="top">
      <h1>
        <span
          className={`conn ${connected ? "on" : "off"}`}
          role="status"
          aria-label={connected ? "connected" : "disconnected"}
          title={connected ? "connected" : "disconnected"}
        />
        Orca agents
      </h1>
      <div className="stats">
        <span className="stat tone-work">{counts.work} working</span>
        <span className="stat tone-wait">{counts.wait} need you</span>
        <span className="stat tone-done">{counts.done} done</span>
        <span className="muted small">
          {plural(snapshot?.worktrees.length ?? 0, "worktree")} · updated{" "}
          {snapshot ? `${timeAgo(snapshot.at, now)} ago` : "—"}
        </span>
      </div>
      <div className="filters">
        <input
          name="query"
          placeholder="Filter (ticket, branch, PR…)"
          aria-label="Filter worktrees"
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
        />
        <select
          name="repo"
          aria-label="Repository"
          value={filters.repo ?? ""}
          onChange={(e) => update({ repo: e.target.value || null })}
        >
          <option value="">All repos</option>
          {repos.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <label className="toggle">
          <input
            type="checkbox"
            name="activeOnly"
            checked={filters.activeOnly}
            onChange={(e) => update({ activeOnly: e.target.checked })}
          />
          Active only
        </label>
      </div>
    </header>
  );
}
