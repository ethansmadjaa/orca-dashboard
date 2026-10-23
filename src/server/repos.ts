import type { OrcaClient } from "./orca";
import type { RawRepo } from "./orca-types";

const GITHUB_PREFIX = "github.com/";

/** Maps Orca repo ids to `owner/name` for repos hosted on GitHub. */
export function githubSlugs(repos: RawRepo[]): Map<string, string> {
  const slugs = new Map<string, string>();
  for (const repo of repos) {
    const key = repo.gitRemoteIdentity?.canonicalKey;
    if (key?.startsWith(GITHUB_PREFIX)) slugs.set(repo.id, key.slice(GITHUB_PREFIX.length));
  }
  return slugs;
}

type Options = { orca: Pick<OrcaClient, "listRepos">; ttlMs: number; now?: () => number };

export function createRepoSlugCache({ orca, ttlMs, now = Date.now }: Options): () => Promise<Map<string, string>> {
  let slugs = new Map<string, string>();
  let fetchedAt: number | null = null;

  return async () => {
    if (fetchedAt !== null && now() - fetchedAt < ttlMs) return slugs;
    slugs = githubSlugs(await orca.listRepos());
    fetchedAt = now();
    return slugs;
  };
}
