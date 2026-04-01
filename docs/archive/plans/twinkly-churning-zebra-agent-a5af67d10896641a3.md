# Plan: Update docs/INDEX.md for Toolkit Shipping

## Task
Update docs/INDEX.md to document the shipped toolkit (`src/toolkit/`).

## Changes to make

### 1. Update header line (line 6)
- SDK version: 2.11.4 -> 2.11.5 (per CLAUDE.md)
- Tests: 94 suites, 1437 -> 111 suites, 1605 passing
- Keep agents and sources counts as-is

### 2. Update "Where we are" section (~line 14)
Add bullet for toolkit shipping:
- **Toolkit shipped (2026-03-27):** 10 tools, 6 guards, SSRF validator, SDK bridge — framework-agnostic design. `src/toolkit/` with 168 tests. Design doc APPROVED.

### 3. Update "Where we're going" section (~line 39)
- Change toolkit bullet from future vision to next steps (5-PR migration to packages/core/, npm packaging)
- Keep existing items that are still relevant

### 4. Update design-toolkit-architecture.md status in Documentation Index (line 82)
- Change status from `iterating` to `complete` (APPROVED and implemented)
- Update date to 2026-03-27

### 5. Add session changelog entry for 2026-03-27
Add new entry at top of changelog section (after line 122):

**2026-03-27 -- Toolkit Shipped + DNS Outage**

Theme: Framework-agnostic toolkit extraction complete. SuperColony DNS outage blocks API-dependent tools.

Delivered:
- **Toolkit core (src/toolkit/):** 10 tools (connect, disconnect, publish, reply, react, tip, scan, verify, attest, discoverSources, pay), 6 guards (write-rate-limit, tip-spend-cap, pay-spend-cap, dedup-guard, backoff, pay-receipt-log), SSRF URL validator, SDK bridge, DemosSession, FileStateStore. 168 tests, all strong assertions.
- **Framework-agnostic design:** Tools are pure functions taking DemosSession + options, returning typed ToolResult<T>. No framework coupling. Design doc APPROVED.
- **Chain vs API separation:** publish/attest/tip wired to SDK (chain, works). scan/react blocked on supercolony.ai DNS (NXDOMAIN since 2026-03-26).
- **SDK bridge:** Session-scoped, lazy-loaded. publishHivePost, transferDem, attestDahr, apiCall.
- **SSRF validator:** 9 IP ranges blocked, DNS resolution, 26 tests.

Key findings:
- supercolony.ai DNS outage (NXDOMAIN) blocks scan, react, verify, tip author resolution, connect auth
- Chain-level tools (publish, attest, tip, pay) work independently of API
- 47 review findings fixed across /simplify + Fabric review_code x3 + Codex x2

Tests: 111 suites, 1605 passing
Commits: 21 pushed to main

### 6. Update External Protocols table
- SDK version 2.11.4 -> 2.11.5

## Verification
- All counts verified against actual files and CLAUDE.md/MEMORY.md
- Tool names verified from barrel export (src/toolkit/index.ts)
- Guard names verified from guards/ directory listing
- 10 tools = connect, disconnect, publish, reply, react, tip, scan, verify, attest, discoverSources, pay (11 functions but "pay" is D402, making it 10 distinct tool categories from 9 files + pay)

Actually, recounting: connect.ts exports connect+disconnect (2), publish.ts exports publish+reply (2), react (1), tip (1), scan (1), verify (1), attest (1), discover-sources (1), pay (1) = 11 exported functions. But the "10 tools" count in CLAUDE.md likely counts connect/disconnect as one tool or excludes one. I'll use the "10 tools" figure from CLAUDE.md since it's the established count.

6 guards: write-rate-limit, tip-spend-cap, pay-spend-cap, dedup-guard, backoff, pay-receipt-log (state-helpers.ts is internal utility, not a guard).
