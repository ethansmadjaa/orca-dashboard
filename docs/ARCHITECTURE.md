# Architecture

A single Bun process serves the React UI and a small JSON/SSE API. Bun bundles `src/client/index.html` on the fly, so there is no separate build step.

```
Orca CLI ──(argv, --json)──► server ──(SSE /api/stream)──► browser
gh CLI   ──(cached 5 min)──►        ◄─(POST /api/send, /api/focus)──
```

## Layout

| Path                       | Role                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/shared/types.ts`      | The wire format between server and UI. Everything the UI renders is in here, already normalized.             |
| `src/server/index.ts`      | Composition root: reads config, wires the modules, starts `Bun.serve`. The only file that calls `Bun.serve`. |
| `src/server/exec.ts`       | `createRunCommand`: the only file that spawns processes (`Bun.spawn`), with a 10 s kill timeout.             |
| `src/server/orca.ts`       | Typed `OrcaClient` over the CLI, plus `parseOrcaOutput` for the `{ ok, result, error }` envelope.            |
| `src/server/orca-types.ts` | Raw CLI shapes (only the fields we read).                                                                    |
| `src/server/snapshot.ts`   | Pure mapping from raw Orca data to `Snapshot`: issue/PR detection, agent ↔ terminal wiring.                  |
| `src/server/github.ts`     | Cache-first `gh` lookup. Never blocks a snapshot; refreshes in the background.                               |
| `src/server/repos.ts`      | Orca repo id → GitHub `owner/name`, cached for 1 minute.                                                     |
| `src/server/stream.ts`     | SSE fan-out with one polling loop that runs only while a client is connected.                                |
| `src/server/api.ts`        | HTTP handlers, including the Host and Origin checks.                                                         |
| `src/server/demo.ts`       | Fake `OrcaClient` for `bun run demo`.                                                                        |
| `src/client/lib/`          | Pure UI logic: state → tone, filtering and sorting, formatting, fetch helpers.                               |
| `src/client/hooks/`        | SSE subscription, terminal polling, clock, key bindings.                                                     |
| `src/client/components/`   | Presentational components. `App.tsx` owns filter and drawer state.                                           |

## Design rules

- **Dependency injection over globals.** Every server module receives its collaborators (`run`, `orca`, `now`) as parameters. That is what lets the whole server be tested under Node/Vitest with no Orca, no `gh` and no Bun runtime.
- **Normalize on the server.** States are lowercased and branch names stripped of `refs/heads/` before they reach the UI, so the client never has to guess formats.
- **Orca's state vocabulary is open-ended.** `tone()` maps known states to five visual categories, and anything else falls back to `idle`. Add new states there.
- **Security boundary.** `HOST` is hard-coded to loopback. All `/api/*` routes check the `Host` header. Mutations also require the page's `Origin` and `Content-Type: application/json` (which forces a CORS preflight). Terminal handles are validated against `^term_[\w-]+$` before they reach the CLI.
