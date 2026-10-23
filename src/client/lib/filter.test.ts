import { describe, expect, it } from "vitest";
import { agentView, worktreeView } from "../../test/factories";
import { type Filters, filterWorktrees, repoNames } from "./filter";

const all: Filters = { repo: null, activeOnly: false, query: "" };

const login = worktreeView({
  id: "login",
  repo: "web",
  displayName: "Login page",
  branch: "feat/login",
  lastActivityAt: 10,
  issues: [{ number: 42, title: "OAuth", state: null, url: null, source: "orca" }],
});
const billing = worktreeView({
  id: "billing",
  repo: "api",
  displayName: "Billing",
  lastActivityAt: 30,
  pr: { number: 108, title: "Rounding", state: "open", url: null, checksStatus: null },
});
const blocked = worktreeView({
  id: "blocked",
  repo: "api",
  displayName: "Migrations",
  lastActivityAt: 1,
  agents: [agentView({ state: "permission", title: "Run migration" })],
});
const busy = worktreeView({ id: "busy", repo: "web", status: "working", lastActivityAt: 5 });

const ids = (filters: Partial<Filters>) =>
  filterWorktrees([login, billing, blocked, busy], { ...all, ...filters }).map((w) => w.id);

describe("filterWorktrees", () => {
  it("sorts blocked first, then busy, then by most recent activity", () => {
    expect(ids({})).toEqual(["blocked", "busy", "billing", "login"]);
  });

  it("filters by repo", () => {
    expect(ids({ repo: "web" })).toEqual(["busy", "login"]);
  });

  it("keeps only busy or blocked worktrees when activeOnly is set", () => {
    expect(ids({ activeOnly: true })).toEqual(["blocked", "busy"]);
  });

  it.each([
    ["LOGIN", ["login"]],
    ["#42", ["login"]],
    ["oauth", ["login"]],
    ["#108", ["billing"]],
    ["migration", ["blocked"]],
    ["  feat/  ", ["login"]],
    ["nothing-matches", []],
  ])("searches names, branches, issues, PRs and agent titles: %s", (query, expected) => {
    expect(ids({ query })).toEqual(expected);
  });

  it("does not mutate its input", () => {
    const input = [login, blocked];
    filterWorktrees(input, all);
    expect(input).toEqual([login, blocked]);
  });
});

describe("repoNames", () => {
  it("returns unique sorted repo names", () => {
    expect(repoNames([login, billing, blocked, busy])).toEqual(["api", "web"]);
  });
});
