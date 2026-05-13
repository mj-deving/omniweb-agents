# Node3 Web2/DAHR proxy handoff — 2026-05-12

Status: active upstream blocker brief
Scope: bounded handoff for the parked `uw66.1` colony-operator live publish lane

## What this brief is for

Capture the current live-write blocker in one place so the next move is an upstream-quality handoff/fix slice instead of more blind publish retries.

This is not an architecture complaint about the playbook or intent seam.
The current blocker sits lower: hosted auth health plus DAHR/Web2 proxy startup on the active node path.

## Current truth

The maintained no-spend colony-operator proof is still healthy.
The bounded live publish proof is still parked.
That parked state is currently explained better by upstream infra than by operator logic.

## Observed facts

| Surface | Result | Why it matters |
|---|---|---|
| Hosted auth challenge | `https://supercolony.ai/api/auth/challenge` returns `500` | The canonical hosted auth surface is unhealthy. |
| Node auth challenge paths | The same auth path on `node2`, `node3`, and `demosnode.discus` returns `404` | Simple node switching cannot replace the hosted auth path by just repointing the API base. |
| `node3` spend-bearing attestation / publish path | `dahr.startProxy()` times out after `30000ms` | The active write lane fails before acceptance on proxy startup. |
| Raw `node3` Web2 proxy probe | `web2Request(startProxy)` surfaced payload `504`, then follow-up HTTP `502 Bad Gateway` (`nginx/1.18.0`) | This points at upstream node/Web2 proxy failure rather than prompt/playbook routing drift. |
| `node2` reroute attempt | Raw chain balance `0 DEM`; spend-bearing attestation fails with `Insufficient balance: required 1, available 0` | `node2` removes the proxy symptom but is still not a viable spend-bearing escape hatch. |
| `demosnode.discus` reroute attempt | Raw chain balance `1000 DEM`, but spend-bearing attestation still fails on `dahr.startProxy()` timeout | A route with balance is still blocked on the same proxy-startup class of failure. |
| Colony/API vs raw chain balance | Colony/API balance can read `1000 DEM` while raw chain balance on `node2` reads `0 DEM` | Readiness/executable truth is not the same as a real spendable live lane. |

## Diagnosis

The colony-operator path is mostly doing the right thing at the policy/routing layer.
The live blocker is lower in the stack:

1. hosted auth is unstable
2. DAHR/Web2 proxy startup is unstable on the live route we need
3. node fallback does not currently restore both auth truth and a spend-bearing balance path at the same time

So the honest current statement is:

- read / decide / route proof is real
- no-spend dry-run proof is real
- live attested-write proof is blocked upstream

## Rerun rule

Do **not** spend more `uw66.1` live publish retries just to see if it works now.
Only do one fresh bounded rerun after the preconditions materially change.

## Minimum rerun preconditions

1. Hosted auth is healthy again **or** there is a verified alternate auth path for the active route.
2. The chosen active node can complete a bounded `startProxy` probe for the target attestation URL.
3. The chosen active node shows a credible spend-bearing balance path, not just a cached colony/API balance surface.
4. The rerun stays single-shot and evidence-capturing.

## What upstream needs to look at

1. Why `https://supercolony.ai/api/auth/challenge` is returning `500`.
2. Why `node3` Web2 proxy startup is surfacing `504` / `502 Bad Gateway` during `startProxy`.
3. Whether `demosnode.discus` shares the same Web2/DAHR proxy failure mode.
4. Why node-level raw balance truth diverges from colony/API balance on `node2`.

## Operator next move

The immediate next move is:

1. refresh roadmap/doctrine mirrors so fresh sessions stop resuming from stale blocker text
2. hand off this auth/proxy blocker upstream
3. wait for a material infra change
4. then do at most one fresh bounded `uw66.1` rerun
