# Security policy

orca-dashboard can send keystrokes to your coding agents' terminals, so a vulnerability here can amount to code execution on the developer's machine. Please report issues privately.

## Reporting

Use [GitHub private vulnerability reporting](https://github.com/ethansmadjaa/orca-dashboard/security/advisories/new). Do not open a public issue. Include steps to reproduce and the impact. You should get an answer within a week.

## Supported versions

Only the latest release on `main` receives fixes.

## Threat model

In scope:

- Another website open in the same browser driving the API (CSRF, DNS rebinding, CORS bypass)
- Input that reaches the Orca or `gh` CLIs in an unintended way (argument injection)
- Anything that exposes the server beyond `127.0.0.1`

Out of scope: an attacker who already runs code as your user on your machine.
