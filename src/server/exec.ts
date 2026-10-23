export type CommandResult = { ok: boolean; stdout: string; stderr: string };

/** Runs a command without a shell. Injected everywhere so tests never spawn processes. */
export type RunCommand = (cmd: string[]) => Promise<CommandResult>;

/** A hung CLI must surface as an error, not freeze polling or pile up processes. */
export function createRunCommand(timeoutMs: number): RunCommand {
  return async (cmd) => {
    const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, timeoutMs);
    try {
      const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      if (timedOut) return { ok: false, stdout: "", stderr: `${cmd[0] ?? "command"} timed out after ${timeoutMs} ms` };
      return { ok: code === 0, stdout, stderr };
    } finally {
      clearTimeout(timer);
    }
  };
}
