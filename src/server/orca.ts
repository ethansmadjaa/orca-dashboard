import type { CommandResult, RunCommand } from "./exec";
import type { RawRepo, RawTerminal, RawTerminalRead, RawWorktree } from "./orca-types";

type OrcaEnvelope<T> = { ok: boolean; result?: T; error?: { message?: string } | string };

/** Unwraps the `{ ok, result, error }` envelope every `orca … --json` command prints. */
export function parseOrcaOutput<T>(args: string[], { stdout, stderr }: CommandResult): T {
  const command = `orca ${args.join(" ")}`;
  let envelope: OrcaEnvelope<T>;
  try {
    envelope = JSON.parse(stdout) as OrcaEnvelope<T>;
  } catch {
    const detail = (stderr || stdout).trim().slice(0, 300);
    throw new Error(`${command}: ${detail || "no JSON output"}`);
  }
  if (!envelope.ok || envelope.result === undefined) {
    const { error } = envelope;
    throw new Error(typeof error === "string" ? error : (error?.message ?? `${command} failed`));
  }
  return envelope.result;
}

/** The subset of the Orca CLI the dashboard depends on. */
export type OrcaClient = {
  listWorktrees(): Promise<RawWorktree[]>;
  listTerminals(): Promise<RawTerminal[]>;
  listRepos(): Promise<RawRepo[]>;
  readTerminal(handle: string, limit: number): Promise<RawTerminalRead>;
  sendToTerminal(handle: string, text: string): Promise<void>;
  focusTerminal(handle: string): Promise<void>;
};

export function createOrcaClient(run: RunCommand, command: string): OrcaClient {
  const call = async <T>(args: string[]): Promise<T> =>
    parseOrcaOutput<T>(args, await run([command, ...args, "--json"]));

  return {
    listWorktrees: async () => (await call<{ worktrees: RawWorktree[] }>(["worktree", "ps"])).worktrees,
    listTerminals: async () => (await call<{ terminals: RawTerminal[] }>(["terminal", "list"])).terminals,
    listRepos: async () => (await call<{ repos: RawRepo[] }>(["repo", "list"])).repos,
    readTerminal: async (handle, limit) =>
      (await call<{ terminal: RawTerminalRead }>(["terminal", "read", "--terminal", handle, "--limit", String(limit)]))
        .terminal,
    sendToTerminal: async (handle, text) => {
      // `--text=` keeps text starting with "--" from being parsed as another orca option.
      await call(["terminal", "send", "--terminal", handle, `--text=${text}`, "--enter"]);
    },
    focusTerminal: async (handle) => {
      await call(["terminal", "switch", "--terminal", handle]);
    },
  };
}
