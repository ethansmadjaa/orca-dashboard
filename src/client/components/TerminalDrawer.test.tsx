// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { worktreeView } from "../../test/factories";
import { TerminalDrawer } from "./TerminalDrawer";

const worktree = worktreeView({
  displayName: "Add OAuth",
  terminals: [
    { handle: "term_shell", title: "zsh", agentIdentity: null, lastOutputAt: null, preview: "" },
    { handle: "term_agent", title: "claude", agentIdentity: "claude", lastOutputAt: null, preview: "" },
  ],
});

type Call = { url: string; init?: RequestInit };

function mockFetch() {
  const calls: Call[] = [];
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.startsWith("/api/terminal")) {
      const handle = new URL(url, "http://x").searchParams.get("handle");
      return Promise.resolve(Response.json({ handle, status: "running", lines: [`\x1b[32mout of ${handle}\x1b[0m`] }));
    }
    return Promise.resolve(Response.json({ ok: true }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

describe("TerminalDrawer", () => {
  let calls: Call[];
  beforeEach(() => {
    calls = mockFetch();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens the agent terminal first and strips ANSI codes", async () => {
    render(<TerminalDrawer worktree={worktree} initialHandle={null} onClose={vi.fn()} />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["claude", "zsh"]);
    expect(await screen.findByText("out of term_agent")).toBeInTheDocument();
  });

  it("honours the requested terminal and switches on tab click", async () => {
    render(<TerminalDrawer worktree={worktree} initialHandle="term_shell" onClose={vi.fn()} />);
    expect(await screen.findByText("out of term_shell")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: /claude/ }));
    expect(await screen.findByText("out of term_agent")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /claude/ })).toHaveAttribute("aria-selected", "true");
  });

  it("sends text to the selected terminal and clears the input", async () => {
    render(<TerminalDrawer worktree={worktree} initialHandle={null} onClose={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "Text to send" });
    await userEvent.type(input, "yes{Enter}");

    await waitFor(() => expect(input).toHaveValue(""));
    const send = calls.find((c) => c.url === "/api/send");
    expect(JSON.parse(send?.init?.body as string)).toEqual({ handle: "term_agent", text: "yes" });
  });

  it("shows the server error when sending fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          url === "/api/send"
            ? Response.json({ ok: false, error: "terminal closed" }, { status: 502 })
            : Response.json({ handle: "term_agent", status: "running", lines: [] }),
        ),
      ),
    );
    render(<TerminalDrawer worktree={worktree} initialHandle={null} onClose={vi.fn()} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Text to send" }), "yes{Enter}");
    expect(await screen.findByText("terminal closed")).toBeInTheDocument();
  });

  it("focuses the terminal in Orca", async () => {
    render(<TerminalDrawer worktree={worktree} initialHandle={null} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Open in Orca" }));
    const focus = calls.find((c) => c.url === "/api/focus");
    expect(JSON.parse(focus?.init?.body as string)).toEqual({ handle: "term_agent" });
  });

  it("closes on Escape and on the close button", async () => {
    const onClose = vi.fn();
    render(<TerminalDrawer worktree={worktree} initialHandle={null} onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("ignores Escape while typing", async () => {
    const onClose = vi.fn();
    render(<TerminalDrawer worktree={worktree} initialHandle={null} onClose={onClose} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Text to send" }), "draft{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("falls back to another terminal when the selected one closes", async () => {
    const { rerender } = render(<TerminalDrawer worktree={worktree} initialHandle="term_shell" onClose={vi.fn()} />);
    expect(await screen.findByText("out of term_shell")).toBeInTheDocument();

    rerender(
      <TerminalDrawer
        worktree={{ ...worktree, terminals: worktree.terminals.filter((t) => t.handle !== "term_shell") }}
        initialHandle="term_shell"
        onClose={vi.fn()}
      />,
    );
    expect(await screen.findByText("out of term_agent")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /claude/ })).toHaveAttribute("aria-selected", "true");
  });

  it("polls one request at a time, even when Orca is slow", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn(() => new Promise<Response>(() => undefined));
    vi.stubGlobal("fetch", fetchMock);
    render(<TerminalDrawer worktree={worktree} initialHandle={null} onClose={vi.fn()} />);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("renders without React warnings", async () => {
    const consoleError = vi.spyOn(console, "error");
    render(<TerminalDrawer worktree={worktree} initialHandle={null} onClose={vi.fn()} />);
    await screen.findByText("out of term_agent");
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("handles worktrees without terminals", () => {
    render(<TerminalDrawer worktree={worktreeView()} initialHandle={null} onClose={vi.fn()} />);
    expect(screen.getByText("No live terminal")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Text to send" })).toBeDisabled();
    expect(calls).toHaveLength(0);
  });
});
