import { tone } from "../lib/status";

export function StatusPill({ state }: { state: string }) {
  return <span className={`pill tone-${tone(state)}`}>{state}</span>;
}
