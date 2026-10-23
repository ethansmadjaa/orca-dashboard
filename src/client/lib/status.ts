import type { AgentView, WorktreeView } from "../../shared/types";

/** Visual category of an Orca/agent state. Orca's state vocabulary is open-ended, so unknown states are "idle". */
export type Tone = "work" | "wait" | "done" | "idle" | "error";

const TONES: Record<Exclude<Tone, "idle">, readonly string[]> = {
  work: ["working", "running", "busy", "thinking"],
  wait: ["waiting", "permission", "blocked", "needs-input", "question"],
  done: ["done", "completed", "finished", "success"],
  error: ["error", "failed", "crashed"],
};

export function tone(state: string): Tone {
  const s = state.toLowerCase();
  for (const [t, states] of Object.entries(TONES) as [Tone, readonly string[]][]) {
    if (states.includes(s)) return t;
  }
  return "idle";
}

/** Something in this worktree is blocked on a human. */
export function needsAttention(w: WorktreeView): boolean {
  return tone(w.status) === "wait" || w.agents.some((a) => tone(a.state) === "wait");
}

export function isBusy(w: WorktreeView): boolean {
  return tone(w.status) === "work" || w.agents.some((a) => tone(a.state) === "work");
}

/** Sort key: blocked first, then busy, then the rest. */
export function priority(w: WorktreeView): number {
  if (needsAttention(w)) return 0;
  if (isBusy(w)) return 1;
  return 2;
}

export function countAgentsByTone(agents: AgentView[]): Record<Tone, number> {
  const counts: Record<Tone, number> = { work: 0, wait: 0, done: 0, idle: 0, error: 0 };
  for (const a of agents) counts[tone(a.state)] += 1;
  return counts;
}
