import { describe, expect, it } from "vitest";
import { createDemoOrcaClient } from "./demo";
import { createRepoSlugCache } from "./repos";
import { createSnapshotLoader } from "./snapshot";

describe("demo mode", () => {
  it("produces a complete snapshot through the real pipeline", async () => {
    const orca = createDemoOrcaClient(() => 1_000_000);
    const load = createSnapshotLoader({
      orca,
      repoSlugs: createRepoSlugCache({ orca, ttlMs: 60_000 }),
      github: () => null,
    });

    const snapshot = await load();

    expect(snapshot.worktrees.map((w) => w.id)).toEqual(["wt-auth", "wt-billing", "wt-docs"]);
    const auth = snapshot.worktrees[0]!;
    expect(auth.branch).toBe("feat/ticket-42-oauth");
    expect(auth.issues).toEqual([expect.objectContaining({ number: 42, source: "orca" })]);
    expect(auth.agents[0]?.handle).toBe("term_auth");
    expect(snapshot.worktrees[1]?.pr).toMatchObject({ number: 108, state: "open", checksStatus: "failure" });
    expect(snapshot.worktrees[2]?.issues).toEqual([
      expect.objectContaining({ number: 7, source: "prompt", url: "https://github.com/acme/acme-docs/issues/7" }),
    ]);
  });
});
