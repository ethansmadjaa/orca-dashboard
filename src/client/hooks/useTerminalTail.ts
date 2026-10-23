import { useEffect, useState } from "react";
import type { TerminalTail } from "../../shared/types";
import { fetchTerminalTail } from "../lib/api";

const POLL_MS = 1_500;

/**
 * Polls a terminal's last lines, one request at a time: the next poll is scheduled only once the
 * previous one settles, so a slow Orca never stacks requests or applies responses out of order.
 * Mount it with `key={handle}` so switching terminals starts clean.
 */
export function useTerminalTail(handle: string) {
  const [tail, setTail] = useState<TerminalTail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const next = await fetchTerminalTail(handle);
        if (!alive) return;
        setTail(next);
        setError(null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
      if (alive) timer = setTimeout(() => void poll(), POLL_MS);
    };
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [handle]);

  return { tail, error };
}
