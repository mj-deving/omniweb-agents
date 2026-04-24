# Runtime Substrate

This document describes the **runtime substrate** for the OmniWeb alpha workspace: the execution layer beneath the portable bundle and the local operator overlay.

## What the runtime substrate includes

- OpenClaw gateway availability
- loopback/WebSocket transport to the gateway
- device identity and stored device-auth state
- provider auth profiles in OpenClaw config
- global default-workspace wiring
- the execution path needed for a real local turn

## Current status

### Runtime-present
These are the kinds of facts that count as runtime-present:
- gateway `/health` responds
- gateway `/ready` responds
- raw WebSocket connection works and yields `connect.challenge`
- device identity/auth artifacts exist and match
- provider auth profiles exist
- workspace wiring is configured as intended

### Runtime-proven
These are **not yet guaranteed by bundle shape alone**:
- onboarding succeeds end-to-end
- provider auth is usable in a successful real turn
- a real local turn completes successfully

## Current blocker class

The dominant runtime blocker class observed in current alpha testing is the OpenClaw CLI/client path after gateway challenge.

Observed pattern:
- `openclaw --help` and `openclaw --version` work
- runtime-oriented commands can hang or time out
- wiring/auth presence alone does not necessarily fix that

So the runtime substrate can be **present but not yet execution-proven**.

## Relationship to other docs

- `OMNIWEB_CURRENT_CONTRACT.md` — overall alpha truth
- `RUNTIME_LIMITATIONS.md` — concise statement of current runtime limitations
- `RUNTIME_EXECUTION_CONTRACT.md` — exact proof boundary for execution-proven status
