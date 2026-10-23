# Contributing

Thanks for helping out. Bug reports, fixes and features are all welcome.

## Setup

```sh
bun install
bun run demo    # UI with fake data, no Orca needed
bun run dev     # against your local Orca
```

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before touching the server: it explains where each concern lives.

## Making a change

1. Open an issue first for anything bigger than a small fix, so we can agree on the approach.
2. Branch from `main`.
3. Add or update tests. Server logic and `src/client/lib` are pure and get unit tests. Components get Testing Library tests (`// @vitest-environment jsdom`).
4. Run `bun run check` (typecheck, ESLint, Prettier, Vitest). CI runs the same checks.
5. For UI changes, attach a screenshot taken with `bun run demo`. Never use screenshots of your real worktrees.
6. Add a line under "Unreleased" in [CHANGELOG.md](CHANGELOG.md) for user-visible changes.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).

## Code style

Prettier and ESLint decide formatting and most style questions: run `bun run lint:fix && bun run format`. Beyond that:

- Prefer `type` over `interface`, named exports, and small pure functions.
- Keep Bun-specific APIs in `src/server/exec.ts` and `src/server/index.ts`, so everything else stays testable under Node.
- Comments explain _why_, not _what_.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
