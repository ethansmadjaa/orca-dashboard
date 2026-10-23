import index from "../client/index.html";
import { createApi } from "./api";
import { loadConfig } from "./config";
import { createDemoOrcaClient } from "./demo";
import { type RunCommand, createRunCommand } from "./exec";
import { createGithubLookup } from "./github";
import { createOrcaClient } from "./orca";
import { createRepoSlugCache } from "./repos";
import { createSnapshotLoader } from "./snapshot";
import { createSnapshotStream } from "./stream";

const config = loadConfig(process.env);
const runCommand = createRunCommand(config.commandTimeoutMs);

const orca = config.demo ? createDemoOrcaClient() : createOrcaClient(runCommand, config.orcaCommand);
const offline: RunCommand = () => Promise.resolve({ ok: false, stdout: "", stderr: "demo mode" });
const github = createGithubLookup({ run: config.demo ? offline : runCommand, ttlMs: config.githubTtlMs });
const repoSlugs = createRepoSlugCache({ orca, ttlMs: config.repoTtlMs });

const stream = createSnapshotStream({
  load: createSnapshotLoader({ orca, repoSlugs, github }),
  intervalMs: config.pollMs,
});
const api = createApi({ orca, stream, port: config.port, terminalTailLines: config.terminalTailLines });

const server = Bun.serve({
  hostname: config.host,
  port: config.port,
  // SSE connections stay open indefinitely.
  idleTimeout: 0,
  development: !config.production,
  routes: {
    "/": index,
    "/api/stream": { GET: api.stream },
    "/api/terminal": { GET: api.terminal },
    "/api/send": { POST: api.send },
    "/api/focus": { POST: api.focus },
  },
});

console.log(`orca-dashboard${config.demo ? " (demo)" : ""} → http://${server.hostname}:${server.port}`);
