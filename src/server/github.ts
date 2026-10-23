import type { RunCommand } from "./exec";

export type GithubKind = "issue" | "pr";
export type GithubItem = { title: string; state: string; url: string };

/**
 * Synchronous, cache-first lookup. Returns whatever is cached (possibly stale or null) and
 * refreshes in the background, so a slow `gh` never delays a snapshot; the next tick sees the result.
 */
export type GithubLookup = (kind: GithubKind, slug: string, number: number) => GithubItem | null;

type Options = { run: RunCommand; ttlMs: number; now?: () => number };

export function createGithubLookup({ run, ttlMs, now = Date.now }: Options): GithubLookup {
  const cache = new Map<string, { at: number; value: GithubItem | null }>();
  const inFlight = new Set<string>();

  const refresh = async (key: string, kind: GithubKind, slug: string, number: number) => {
    inFlight.add(key);
    let value: GithubItem | null = null;
    try {
      const { ok, stdout } = await run(["gh", kind, "view", String(number), "-R", slug, "--json", "title,state,url"]);
      if (ok) {
        const item = JSON.parse(stdout) as GithubItem;
        value = { ...item, state: item.state.toLowerCase() };
      }
    } catch {
      // gh missing, not authenticated or malformed output: remember the miss until the TTL expires.
    } finally {
      cache.set(key, { at: now(), value });
      inFlight.delete(key);
    }
  };

  return (kind, slug, number) => {
    const key = `${kind}:${slug}#${number}`;
    const hit = cache.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.value;
    if (!inFlight.has(key)) void refresh(key, kind, slug, number);
    return hit?.value ?? null;
  };
}
