// @vitest-environment jsdom
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Snapshot } from "../shared/types";
import { agentView, worktreeView } from "../test/factories";
import { App } from "./App";

class FakeEventSource {
  static last: FakeEventSource | null = null;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: MessageEvent<string>) => void) | null = null;
  closed = false;
  constructor(readonly url: string) {
    FakeEventSource.last = this;
  }
  close() {
    this.closed = true;
  }
  push(snapshot: Snapshot) {
    act(() => this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(snapshot) })));
  }
}

const snapshot: Snapshot = {
  at: Date.now(),
  error: null,
  worktrees: [
    worktreeView({ id: "a", repo: "web", displayName: "Quiet one", status: "done" }),
    worktreeView({
      id: "b",
      repo: "api",
      displayName: "Needs you",
      agents: [agentView({ state: "permission", handle: null })],
    }),
    worktreeView({ id: "c", repo: "web", displayName: "Busy one", agents: [agentView({ state: "working" })] }),
  ],
};

const cardTitles = () => screen.queryAllByRole("article").map((a) => within(a).getByRole("heading").textContent);

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json({ handle: "term_1", status: "ok", lines: [] }))),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("waits for the first snapshot", () => {
    render(<App />);
    expect(screen.getByText("Connecting to Orca…")).toBeInTheDocument();
    expect(FakeEventSource.last?.url).toBe("/api/stream");
  });

  it("renders worktrees by priority with live counters", () => {
    render(<App />);
    FakeEventSource.last?.push(snapshot);
    expect(cardTitles()).toEqual(["Needs you", "Busy one", "Quiet one"]);
    expect(screen.getByText("1 working")).toBeInTheDocument();
    expect(screen.getByText("1 need you")).toBeInTheDocument();
    expect(screen.getByText(/3 worktrees/)).toBeInTheDocument();
  });

  it("filters by text, repo and activity", async () => {
    render(<App />);
    FakeEventSource.last?.push(snapshot);

    await userEvent.type(screen.getByRole("textbox", { name: "Filter worktrees" }), "busy");
    expect(cardTitles()).toEqual(["Busy one"]);
    await userEvent.clear(screen.getByRole("textbox", { name: "Filter worktrees" }));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Repository" }), "web");
    expect(cardTitles()).toEqual(["Busy one", "Quiet one"]);

    await userEvent.click(screen.getByRole("checkbox", { name: "Active only" }));
    expect(cardTitles()).toEqual(["Busy one"]);

    await userEvent.type(screen.getByRole("textbox", { name: "Filter worktrees" }), "zzz");
    expect(screen.getByText("No worktree matches the filters")).toBeInTheDocument();
  });

  it("shows Orca errors while keeping the last worktrees", () => {
    render(<App />);
    FakeEventSource.last?.push({ ...snapshot, error: "orca: runtime not reachable" });
    expect(screen.getByRole("alert")).toHaveTextContent("runtime not reachable");
    expect(cardTitles()).toHaveLength(3);
  });

  it("opens and closes the terminal drawer, and closes it if the worktree disappears", async () => {
    render(<App />);
    FakeEventSource.last?.push(snapshot);

    await userEvent.click(screen.getByRole("button", { name: /Quiet one/ }));
    expect(screen.getByRole("complementary", { name: "Terminals of Quiet one" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Quiet one/ }));
    FakeEventSource.last?.push({ ...snapshot, worktrees: snapshot.worktrees.filter((w) => w.id !== "a") });
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();

    FakeEventSource.last?.push(snapshot);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("drops a repo filter whose repo disappeared", async () => {
    render(<App />);
    FakeEventSource.last?.push(snapshot);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Repository" }), "api");
    expect(cardTitles()).toEqual(["Needs you"]);

    FakeEventSource.last?.push({ ...snapshot, worktrees: snapshot.worktrees.filter((w) => w.repo !== "api") });
    expect(screen.getByRole("combobox", { name: "Repository" })).toHaveValue("");
    expect(cardTitles()).toEqual(["Busy one", "Quiet one"]);
  });

  it("tracks the connection state", () => {
    render(<App />);
    act(() => FakeEventSource.last?.onopen?.());
    expect(screen.getByRole("status", { name: "connected" })).toBeInTheDocument();
    act(() => FakeEventSource.last?.onerror?.());
    expect(screen.getByRole("status", { name: "disconnected" })).toBeInTheDocument();
  });
});
