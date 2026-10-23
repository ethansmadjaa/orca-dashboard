import { useMemo, useState } from "react";
import type { WorktreeView } from "../../shared/types";
import { useKey } from "../hooks/useKey";
import { SendForm } from "./SendForm";
import { TerminalOutput } from "./TerminalOutput";

type Props = {
  worktree: WorktreeView;
  initialHandle: string | null;
  onClose: () => void;
};

/** Side panel with a worktree's terminals. Render with a key per opened worktree/agent to reset the selection. */
export function TerminalDrawer({ worktree: w, initialHandle, onClose }: Props) {
  // Agent terminals first: they are what you usually want to read.
  const terminals = useMemo(
    () => [...w.terminals].sort((a, b) => Number(Boolean(b.agentIdentity)) - Number(Boolean(a.agentIdentity))),
    [w.terminals],
  );
  const [selected, setSelected] = useState<string | null>(initialHandle);
  // Fall back to the first terminal when the selected one has closed.
  const handle = terminals.some((t) => t.handle === selected) ? selected : (terminals[0]?.handle ?? null);
  useKey("Escape", onClose);

  return (
    <aside className="drawer" aria-label={`Terminals of ${w.displayName}`}>
      <header className="drawer-head">
        <div>
          <div className="repo">{w.repo}</div>
          <h2>{w.displayName}</h2>
          <div className="branch">{w.branch}</div>
        </div>
        <button type="button" className="ghost" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      <div className="tabs" role="tablist">
        {terminals.map((t) => (
          <button
            type="button"
            role="tab"
            aria-selected={t.handle === handle}
            key={t.handle}
            className={`tab ${t.handle === handle ? "active" : ""}`}
            onClick={() => setSelected(t.handle)}
            title={t.handle}
          >
            {t.agentIdentity && t.agentIdentity !== t.title && <span className="tab-agent">{t.agentIdentity}</span>}
            {t.title || "terminal"}
          </button>
        ))}
        {terminals.length === 0 && <span className="muted small">No live terminal</span>}
      </div>

      {handle ? <TerminalOutput key={handle} handle={handle} /> : <pre className="term" />}

      <SendForm handle={handle} />
    </aside>
  );
}
