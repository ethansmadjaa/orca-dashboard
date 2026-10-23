# AGENTS.md

Bun + React 19 dashboard over the Orca CLI. The module map is in `docs/ARCHITECTURE.md`: read it before you edit anything under `src/server/`.

## Verify

`bun run check` must pass before you call a change done. It runs typecheck, ESLint, Prettier and Vitest. For a UI change, also load `bun run demo` in a browser and check that the console is clean.

## Conventions the config does not enforce

- Tests run on Node, not Bun. Bun APIs (`Bun.spawn`, `Bun.serve`, HTML imports) live only in `src/server/exec.ts` and `src/server/index.ts`. Every other server module takes its collaborators (`run`, `orca`, `now`) as parameters so tests can inject fakes.
- Component tests start with `// @vitest-environment jsdom`. Build data with the factories in `src/test/factories.ts`.
- The server normalizes data (lowercase states, branches without `refs/heads/`) and the UI renders `src/shared/types.ts` as-is.
- New Orca agent states go in `TONES` in `src/client/lib/status.ts`. Unknown states render as `idle`.
- Reset per-item state in a component by remounting it with a `key`, not with an effect. When siblings share a key source, give them distinct keys.
- Keep the API locked down: loopback bind, `Host` check on every `/api/*` route, `Origin` and JSON content type on mutations, terminal handles validated with `isTerminalHandle`. Changes here need a test in `src/server/api.test.ts`.
- Screenshots and fixtures use the fake `acme` data from `src/server/demo.ts`, never real worktrees.
- UI copy is in English.
