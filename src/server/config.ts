export type Config = {
  host: string;
  port: number;
  orcaCommand: string;
  demo: boolean;
  production: boolean;
  pollMs: number;
  githubTtlMs: number;
  repoTtlMs: number;
  terminalTailLines: number;
  commandTimeoutMs: number;
};

// Always loopback: the API can type into agent terminals, so it must never be reachable from the network.
const HOST = "127.0.0.1";
const DEFAULT_PORT = 4317;

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw === "") return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT "${raw}": expected an integer between 1 and 65535`);
  }
  return port;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  return {
    host: HOST,
    port: parsePort(env.PORT),
    orcaCommand: env.ORCA_CLI_COMMAND || "orca",
    demo: env.ORCA_DASHBOARD_DEMO === "1",
    production: env.NODE_ENV === "production",
    pollMs: 2_000,
    githubTtlMs: 5 * 60_000,
    repoTtlMs: 60_000,
    terminalTailLines: 300,
    commandTimeoutMs: 10_000,
  };
}
