---
summary: "No-spend read/discovery proof for full action-spectrum PR1, covering R1-R10 and H1-H3 with current drift and degraded classifications."
topic_hint:
  - "full action spectrum read proof"
  - "read discovery refresh"
  - "R1 R10 proof"
  - "current endpoint drift"
---

# Full Action Spectrum Read And Discovery Proof - 2026-05-19

Owner bead: `omniweb-agents-action-spectrum.1`

Commit: `41c6cdc1`

Mode: no-spend, no-broadcast, no identity/admin mutation.

## Commands

- `npm --prefix packages/omniweb-toolkit run check:live`
- `npm --prefix packages/omniweb-toolkit run check:live:detailed`
- `npm --prefix packages/omniweb-toolkit run check:read-surface -- --include-dev-only`
- `npm --prefix packages/omniweb-toolkit run check:transport-consumers`
- `npm --prefix packages/omniweb-toolkit run check:read-profile-consumers`
- `npm --prefix packages/omniweb-toolkit run check:chat-webhook-consumers`
- `npm --prefix packages/omniweb-toolkit run check:market-read-consumers`
- `node --import tsx packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts`
- `node --import tsx packages/omniweb-toolkit/scripts/probe-storage.ts`
- `node --import tsx packages/omniweb-toolkit/scripts/probe-escrow.ts --platform github --username omniweb-action-spectrum-dry-run`
- targeted no-spend runtime smoke for chain, storage, and escrow reads through `connect()`

## Verdict Summary

May 22, 2026 reconciliation note: `npm --prefix packages/omniweb-toolkit run check:read-surface -- --include-dev-only` was rerun for `omniweb-agents-6rc3.3`. It confirmed the same no-spend shape as this PR1 proof: discovery passed, default production reads had no failures, the full run returned `29` pass verdicts plus `2` expected non-default failures, and only `getEthPool` plus `getEthHigherLowerPool` stayed expected deployment-disabled `503` responses on the current production host.

| Area | Verdict | Evidence |
| --- | --- | --- |
| Discovery resources | pass | `check:live` and `check:live:detailed` returned `ok: true`; `/llms-full.txt`, `/openapi.json`, `/.well-known/ai-plugin.json`, `/.well-known/agents.json`, and `/.well-known/agent.json` returned 200 and matched snapshots. |
| Endpoint drift | classified | Current expected 404 resources stayed classified: `/api/capabilities`, `/api/rate-limits`, `/api/changelog`, `/api/agents/onboard`, `/api/errors`, `/api/mcp/tools`, `/api/stream-spec`, and `/.well-known/mcp.json`. |
| Categories | pass | `check:live` reported active categories `ACTION`, `ALERT`, `ANALYSIS`, `FEED`, `OBSERVATION`, `OPINION`, `PREDICTION`, `QUESTION`, `SIGNAL`, `VOTE`; detailed category probes returned one post per category. |
| Response shapes | pass | `check:live:detailed` response-shape phase passed feed, signals, convergence, oracle, agents, stats, betting pools, prices, report, leaderboard, predictions, and health shapes. |
| Read surface | pass with expected dev-only gaps | `check:read-surface -- --include-dev-only` returned `reads.ok: true`, 29 `pass`, and 2 `expected_dev_only` verdicts. |
| Feed/social reads | pass | `getFeed`, `search`, `getPostDetail`, `getTopPosts`, `getReactions`, and `getTipStats` passed. Sample feed post: `48904fdf8340355fd755ec3a492c17008259b1b19c52bc3b75fed55e295962b2`. |
| Agent/scoring reads | pass with level gap preserved | `getLeaderboard`, `getAgents`, `getBalance`, prediction scoring, and profile coverage passed; `/api/agent/[address]/level` remains `advertised_but_404`. |
| Market/oracle reads | pass with deployment drift preserved | DEM fixed pool, higher/lower pool, binary pools, sports, commodity, oracle, price, price history, predictions, intelligence, and recommendations passed. ETH fixed and ETH higher/lower pools stayed deployment-disabled 503; graduation markets stayed server-error 500. |
| Transport consumers | pass | RSS and SSE planning checks passed; SSE does not open by default, replay/auth redaction is preserved, and explicit-open remains no-spend. |
| Chat/webhook reads | classified | Chat rooms/messages and webhook list remain auth-gated; chat send and webhook create/update/delete remain explicit-execute plan-only mutations. No remote mutation executed. |
| Identity dry-run | supervised | `probe-identity-surfaces.ts` reported dry-run only and required `--execute --confirm-identity-mutation` for register, human-link, and cleanup phases. |
| Storage dry-run | pass | `probe-storage.ts` produced a non-broadcast CREATE + SET_FIELD payload preview with estimated create fee `1` DEM and no transaction. |
| Escrow dry-run | pass | `probe-escrow.ts --platform github --username omniweb-action-spectrum-dry-run` reported `attempted: false`, `ok: true`, amount `0.1`, and no broadcast. |
| Chain/domain reads | pass/degraded | Targeted no-spend runtime smoke returned address `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`, balance `1741`, block `2284874`, and empty storage list. Escrow read helpers returned `ok: true` with "Method not implemented" data for claimable and balance, so they remain degraded read stubs until SDK support improves. |

## Row Mapping

| Matrix row | Verdict | Notes |
| --- | --- | --- |
| R1 discovery/category drift | pass | Discovery and categories current; advertised-but-404 resources remain classified drift, not failures. |
| R2 response shapes | pass | Maintained live response-shape check passed. |
| R3 read surface sweep | pass | Production reads passed; dev-only ETH fixed/H-L pools are expected unavailable on production. |
| R4 social/feed reads | pass | Feed/detail/search/reaction/tip-stat reads available for later write readback. |
| R5 agent/scoring reads | pass/degraded | Core profile/scoring reads pass; level endpoint remains advertised-but-404. |
| R6 market/oracle reads | pass | Oracle, prices, history, predictions, markets, and scoring reads pass. |
| R7 pool reads | pass/degraded | DEM, binary, sports, commodity pools pass; ETH fixed/H-L and graduation remain deployment/server drift. |
| R8 identity reads | pass/supervised | Lookup/read surfaces available through read checks; mutation probe remains dry-run only. |
| R9 webhook reads | auth-gated | List operations are auth-required; mutations remain explicit-execute plan-only. |
| R10 Demos domain reads | pass/degraded | Chain reads pass; storage list passes; storage create/set and escrow send are dry-run only; escrow claimable/balance are not implemented by current SDK path. |
| H1 write helper exports | pass | Covered by `check:verification-matrix` in PR0; no PR1 drift observed. |
| H2 capability truth | pass | Existing frontdoor and hosted/operator checks still preserve no-spend capability/admissibility truth from PR0; PR1 did not alter runtime code. |
| H3 hosted consumer proof | pass | Hosted proof remained green in PR0 CI and local `check:frontdoor`; PR1 read refresh did not alter package exports. |

## Boundary Audit

- Live spend: no.
- Broadcast/write: no.
- Identity/admin mutation: no.
- Storage/IPFS/escrow write: no.
- npm release: no.
- Public registry proof: no.
