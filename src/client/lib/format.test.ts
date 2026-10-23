import { describe, expect, it } from "vitest";
import { plural, stripAnsi, timeAgo } from "./format";

describe("timeAgo", () => {
  const now = 1_000_000_000;
  it.each([
    [null, "—"],
    [now, "0s"],
    [now + 5_000, "0s"],
    [now - 59_000, "59s"],
    [now - 5 * 60_000, "5 min"],
    [now - 3 * 3_600_000, "3 h"],
    [now - 47 * 3_600_000, "47 h"],
    [now - 4 * 86_400_000, "4 d"],
  ])("%s → %s", (ts, expected) => {
    expect(timeAgo(ts, now)).toBe(expected);
  });
});

describe("plural", () => {
  it("pluralizes everything but one", () => {
    expect(plural(0, "terminal")).toBe("0 terminals");
    expect(plural(1, "terminal")).toBe("1 terminal");
    expect(plural(2, "child", "children")).toBe("2 children");
  });
});

describe("stripAnsi", () => {
  it("removes colors, cursor moves and OSC titles", () => {
    expect(stripAnsi("\x1b[32m✓\x1b[0m ok\x1b[2K\x1b[?25l")).toBe("✓ ok");
    expect(stripAnsi("\x1b]0;title\x07after")).toBe("after");
  });

  it("leaves plain text alone", () => {
    expect(stripAnsi("plain [text]")).toBe("plain [text]");
  });
});
