import { describe, expect, it, vi } from "vitest";
import type { RawRepo } from "./orca-types";
import { createRepoSlugCache, githubSlugs } from "./repos";

const repos: RawRepo[] = [
  { id: "a", gitRemoteIdentity: { canonicalKey: "github.com/acme/app" } },
  { id: "b", gitRemoteIdentity: { canonicalKey: "gitlab.com/acme/other" } },
  { id: "c", gitRemoteIdentity: null },
  { id: "d" },
];

describe("githubSlugs", () => {
  it("keeps only GitHub remotes, as owner/name", () => {
    expect(githubSlugs(repos)).toEqual(new Map([["a", "acme/app"]]));
  });
});

describe("createRepoSlugCache", () => {
  it("refetches only after the TTL", async () => {
    let clock = 0;
    const listRepos = vi.fn().mockResolvedValue(repos);
    const slugs = createRepoSlugCache({ orca: { listRepos }, ttlMs: 1_000, now: () => clock });

    await slugs();
    clock = 999;
    await slugs();
    expect(listRepos).toHaveBeenCalledTimes(1);

    clock = 1_000;
    await expect(slugs()).resolves.toEqual(new Map([["a", "acme/app"]]));
    expect(listRepos).toHaveBeenCalledTimes(2);
  });
});
