# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-23

First public release.

### Added

- Live dashboard of Orca worktrees: branch, issues, PR and CI checks, agents and subagents.
- Terminal drawer: live tail, send text, focus in Orca.
- Issue and PR detection from Orca links, branch names and agent prompts, enriched through `gh`.
- Filters by text, repo and activity. Worktrees waiting on you are sorted first.
- Demo mode (`bun run demo`) with fake data.
- Host-header (DNS rebinding) and Origin (CSRF) checks on the API.
- Vitest suite, ESLint, Prettier and GitHub Actions CI.

### Fixed

- Two clients connecting at the same moment no longer start two polling loops.
- A failed send from the terminal drawer no longer leaves the form stuck in the "sending" state.
- Text starting with `--` is sent to the terminal instead of being parsed as an `orca` option.
- A hung `orca` or `gh` call times out after 10 s instead of freezing updates; terminal polling no longer stacks requests.
- The drawer no longer reopens by itself when a worktree comes back, and switches away from a terminal that closed.
- Escape no longer closes the drawer while you type; a filter on a vanished repo is dropped.

[Unreleased]: https://github.com/ethansmadjaa/orca-dashboard/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ethansmadjaa/orca-dashboard/releases/tag/v0.1.0
