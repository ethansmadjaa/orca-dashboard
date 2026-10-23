// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SendForm } from "./SendForm";

describe("SendForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the draft when switching terminals", async () => {
    const { rerender } = render(<SendForm handle="term_a" />);
    await userEvent.type(screen.getByRole("textbox", { name: "Text to send" }), "draft");
    rerender(<SendForm handle="term_b" />);
    expect(screen.getByRole("textbox", { name: "Text to send" })).toHaveValue("draft");
  });

  it("shows an error only for the terminal it happened on", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json({ ok: false, error: "terminal closed" }))),
    );
    const { rerender } = render(<SendForm handle="term_a" />);
    await userEvent.type(screen.getByRole("textbox", { name: "Text to send" }), "hi{Enter}");
    expect(await screen.findByText("terminal closed")).toBeInTheDocument();

    rerender(<SendForm handle="term_b" />);
    expect(screen.queryByText("terminal closed")).not.toBeInTheDocument();
  });

  it("reports network failures instead of staying stuck", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    render(<SendForm handle="term_a" />);
    await userEvent.type(screen.getByRole("textbox", { name: "Text to send" }), "hi{Enter}");
    expect(await screen.findByText("offline")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Text to send" })).toBeEnabled();
  });
});
