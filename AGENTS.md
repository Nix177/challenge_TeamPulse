# Team Pulse — Governance & Agent Instructions

This document defines the strict operational rules, constraints, and guidelines for all agents working on Team Pulse.

## Workspace Boundary & File Safety
- All operations MUST remain strictly within the project root directory (`e:\challenge huumyk`).
- NEVER read, write, create, move, or delete files outside of this workspace.
- NEVER alter `.git` or global Antigravity configurations.
- ZERO FILE DELETS: If a file becomes obsolete, move it to `_archive/` with a concise explanation.

## Terminal Command Limits
Only the following exact terminal operations are permitted:
- `node --version`
- `node --check`
- `node --test`
- `py -m http.server 4173`
- `python -m http.server 4173`
- `git status`
- `git diff`
- `git log`

Do NOT run npm, npx, curl, wget, powershell scripts, package installation, or any unapproved commands.

## Technology & Privacy Restrictions
- Technology Stack: Pure semantic HTML5, Vanilla CSS3, Vanilla ES Modules (JS).
- ZERO runtime dependencies.
- Absolute ZERO network calls, remote APIs, external fonts, analytics, telemetry, or third-party scripts.
- Absolute ZERO data persistence: `localStorage`, `sessionStorage`, `IndexedDB`, `cookies`, `serviceWorker`, `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` are STRICTLY PROHIBITED. All state must exist strictly in ephemeral JavaScript memory.
- NEVER log participant responses or choices to the console.

## Working Method & Verification Loop
1. **Scope Discipline**: Implement strictly what is specified in `PROJECT_BRIEF.md`. Do not accumulate extra features or metrics (e.g., scores, trends, accounts, export).
2. **Deterministic Logic**: Use pure deterministic rule-based algorithms for insight generation (no LLM / AI calls at runtime).
3. **Mandatory Testing**: Every code edit MUST pass `node --check` and `node --test`.
4. **Browser Verification**: All UI flows MUST be verified visually using the Browser subagent on `http://localhost:4173`.
5. **Truthful Reporting**: Report only observed empirical test and browser results.
6. **Documentation Sync**: Maintain `DECISIONS.md`, `ACCESSIBILITY_AUDIT.md`, and `QA_REPORT.md`.

For product specifications, see [PROJECT_BRIEF.md](PROJECT_BRIEF.md).
For architectural decisions, see [DECISIONS.md](DECISIONS.md).
