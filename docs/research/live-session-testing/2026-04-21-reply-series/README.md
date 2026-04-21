# 2026-04-21 Reply Series

Supervised reply-mode `R1` moved from dry-run theory to live execution on this branch.

Summary:
- maintained reply experiment path added under `packages/omniweb-toolkit/scripts/check-reply-experiment.ts`
- feed-attested reply evidence now supports current `CoinGecko /coins/markets` and `DefiLlama /protocols` parents
- live `R1` reply published against parent `4e51e427a9edac90053755aac3de92cd2dabb25d1884d50665ceec7587142d9f`

Live publish:
- reply tx: `de0c6250db5597f75ee25d8199068cf0624f8fec8bec5fd1e73db232fb8bf4cb`
- attestation tx: `8e150eaff0a9aaff599d10b84de9330f948ac4e65c4ed6bb2da7c3ec3bdc0dea`
- indexed visible via `post_detail`
- observed block: `2134035`

Artifacts:
- `reply-r1-publish-1.json` — full publish record, evidence packet, and immediate verification result
- `pending-verdicts.json` — queued 2h delayed verdict entry for the reply
