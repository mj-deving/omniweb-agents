---
summary: "PR2 live social/write proof for full action-spectrum rows W1-W6, with pass/degraded/failed verdicts, bounded spend accounting, and redacted proof packet paths."
read_when: ["full action spectrum social write proof", "W1 W6 proof", "publish reply react tip vote", "live spend proof"]
topic_hint:
  - "full action spectrum social write proof"
  - "W1 W6 proof"
  - "publish reply react tip vote"
  - "live spend proof"
---

# Full Action Spectrum Social Write Proof - 2026-05-19

Owner bead: `omniweb-agents-action-spectrum.2`

Base commit: `49d8ade5`

Branch: `codex/action-spectrum-pr2-live-social`

Mode: explicitly authorized testnet-only write-probe lane under Beads memory `action-spectrum-live-spend-gates`.

## Authorization And Runtime Target

The user provided standing testnet authorization in chat on 2026-05-19. Beads memory and gate comments bound this PR2 lane to:

- budget: `<=30` testnet DEM total for PR2, max `1 DEM` per tip
- wallet: `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`
- host: `https://supercolony.ai`
- RPC: `https://node3.demos.sh/`
- state dir: `.action-spectrum-state/pr2`
- proof dir: `packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr2/`

No secrets, mnemonics, auth tokens, signatures, or callback material are committed in this proof packet.

## Commands

No-spend preflight:

```bash
node --import tsx packages/omniweb-toolkit/scripts/check-publish-readiness.ts \
  --state-dir .action-spectrum-state/pr2 \
  --category ANALYSIS \
  --attest-url https://blockchain.info/ticker \
  --text "<313 char market note>"
```

W1 standalone attestation:

```bash
node --import tsx packages/omniweb-toolkit/scripts/check-publish-readiness.ts \
  --state-dir .action-spectrum-state/pr2 \
  --category ANALYSIS \
  --attest-url https://blockchain.info/ticker \
  --text "<313 char market note>" \
  --probe-attest
```

W2/W3 publish and reply:

```bash
node --import tsx packages/omniweb-toolkit/scripts/check-publish-visibility.ts \
  --state-dir .action-spectrum-state/pr2 \
  --runs 1 \
  --reply-after-publish \
  --category ANALYSIS \
  --reply-category ANALYSIS \
  --attest-url https://blockchain.info/ticker \
  --feed-timeout-ms 90000 \
  --feed-poll-ms 5000 \
  --feed-limit 75 \
  --record-lifecycle \
  --proof-out packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr2/w3-retry-lifecycle \
  --broadcast \
  --text "<323 char market note>" \
  --reply-text "<295 char reply>"
```

W3 no-spend delayed recheck:

```bash
node --import tsx packages/omniweb-toolkit/scripts/check-publish-visibility.ts \
  --state-dir .action-spectrum-state/pr2 \
  --recheck wl-20260519T111006638Z-a39690b5 \
  --feed-timeout-ms 90000 \
  --feed-poll-ms 5000 \
  --feed-limit 75 \
  --proof-out packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr2/w3-recheck-lifecycle-proof.json
```

W4/W5 reaction/tip command path:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-social-writes.ts \
  --state-dir .action-spectrum-state/pr2 \
  --feed-limit 500 \
  --reaction-timeout-ms 45000 \
  --tip-timeout-ms 60000 \
  --reply-timeout-ms 60000 \
  --poll-ms 3000 \
  --include-tip \
  --record-lifecycle \
  --proof-out packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr2/w4-w5-social-lifecycle \
  --execute \
  --reply-text "<295 char reply>"
```

W6 VOTE attempts:

```bash
node --import tsx packages/omniweb-toolkit/scripts/check-vote-publish.ts \
  --state-dir .action-spectrum-state/pr2 \
  --broadcast \
  --asset BTC \
  --reference-price 76989 \
  --predicted-price 77066 \
  --confidence 70 \
  --attest-url "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd" \
  --verify-timeout-ms 90000 \
  --verify-poll-ms 5000 \
  --verify-limit 75 \
  --record-lifecycle \
  --proof-out packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr2/w6-vote-lifecycle-proof.json \
  --out packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr2/w6-vote-report.json
```

```bash
node --import tsx packages/omniweb-toolkit/scripts/check-vote-publish.ts \
  --state-dir .action-spectrum-state/pr2 \
  --broadcast \
  --asset BTC \
  --reference-price 76937.04 \
  --predicted-price 77014 \
  --confidence 70 \
  --attest-url https://blockchain.info/ticker \
  --verify-timeout-ms 90000 \
  --verify-poll-ms 5000 \
  --verify-limit 75 \
  --record-lifecycle \
  --proof-out packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr2/w6-vote-retry-lifecycle-proof.json \
  --out packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr2/w6-vote-retry-report.json
```

## Spend And Rate Accounting

| Checkpoint | Balance | Hourly remaining | Daily remaining | Notes |
| --- | --- | ---: | ---: | --- |
| Initial no-spend readiness | `1741 DEM` | 5 | 14 | No colony/chain divergence; auth ready. |
| After W2/W3 broadcasts | `1741 DEM` | 2 | 11 | Publish/reply consumed write-rate slots; balance remained unchanged. |
| Final no-spend accounting | `1741 DEM` | 2 | 11 | No colony/chain divergence; auth still ready. |

The PR2 proof stayed inside the recorded `<=30` testnet DEM ceiling. The live social actions here use write-rate slots and DAHR/HIVE writes rather than DEM transfer spend, except tip, which did not execute because the maintained candidate selector skipped before spend.

## Row Mapping

| Matrix row | Verdict | Evidence |
| --- | --- | --- |
| W1 standalone DAHR attestation | pass | Attestation tx `d1d801bfc29974f211423536a3006f3476dc72baafd1f10cf8416ac3548ae944`; response hash `103698567e9b2219cf6283d386ad08ac31a12ee24618dd4642161f33b5391f04`; sanitized proof `action-spectrum-live-proof-2026-05-19/pr2/w1-standalone-attest.json`. |
| W2 DAHR publish | pass | Publish tx `30cd113ad5aeac4aa0c1efa59853662ecfe951b33e5c9ff4caaab8d5e7f93b43` indexed through recent feed after 5 polls / 32440 ms; corrected run publish tx `4fb3ff39c2290b96665d64b1f1975689ecf89ae840a4d0dc7a47f05cbf2e443c` indexed after 9 polls / 76346 ms. |
| W3 reply | degraded | Corrected reply tx `38a5cd29ff4b2989dc21490a37ec387212b5e16456e96a4874ae823683cdd595` and attestation tx `b7bffaea12076a107d8e145b62ad6e4e076857f045aad88c4226ee5d70ceee59` were accepted. Initial readback was chain-only; delayed no-spend recheck found `post_detail` visibility but `indexedVisible=false`, so recent-feed/thread-indexed visibility remains degraded. |
| W4 reaction | degraded/skipped | Authorized `probe-social-writes.ts --execute` ran with `--feed-limit 500`, but skipped before reaction because no untouched attested post met both maintained floors: `score >= 85` and `engagement >= 5`. |
| W5 tip | degraded/skipped | Same authorized social command included `--include-tip`, but skipped before tip for the same candidate-floor reason. No tip tx was sent. |
| W6 VOTE prediction | failed/degraded | No VOTE tx closed. CoinGecko-backed attempt failed before tx because DAHR source returned HTTP 429. Blockchain.info-backed retry failed during publish confirmation with node/SDK error after a 502 response, and category-search readback found no tx. Proof files: `w6-vote-report.json`, `w6-vote-lifecycle-proof.json`, `w6-vote-retry-report.json`, and `w6-vote-retry-lifecycle-proof.json`. |

## Proof Files

All committed proof files are under:

```text
packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr2/
```

Important files:

- `w1-standalone-attest.json`
- `w2-w3-publish-reply-report.json`
- `w2-w3-lifecycle/wl-20260519T110611729Z-3bac69bf.proof.json`
- `w2-w3-lifecycle/wl-20260519T110611737Z-5a6bcaa8.proof.json`
- `w3-retry-publish-reply-report.json`
- `w3-retry-lifecycle/wl-20260519T111006631Z-8c8773a1.proof.json`
- `w3-retry-lifecycle/wl-20260519T111006638Z-a39690b5.proof.json`
- `w3-recheck-lifecycle-proof.json`
- `w4-w5-social-execute-skipped-report.json`
- `w6-vote-report.json`
- `w6-vote-lifecycle-proof.json`
- `w6-vote-retry-report.json`
- `w6-vote-retry-lifecycle-proof.json`

## Boundary Audit

- Mainnet spend: no.
- npm release or public-registry mutation: no.
- Identity/admin mutation: no.
- Storage/IPFS/escrow/domain write: no.
- Tip DEM transfer: no, skipped before spend.
- VOTE tx: no successful VOTE broadcast/readback; failed/degraded with proof.
- Secrets in committed proof: no; redaction scan found no credential variables, auth headers, private key text, or sensitive validation material in committed proof files.
