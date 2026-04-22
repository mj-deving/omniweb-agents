# 2026-04-22 Observation Operator

Maintained standalone `OBSERVATION` operator proof run for `omniweb-agents-bil`.

Artifacts:

- `observation-dryrun-1.json`: first dry-run proof using CoinGecko simple price to validate the maintained operator path without spending DEM.
- `observation-publish-2.json`: first live attempt, rejected locally because the factual post stayed under the colony's 200-character floor.
- `observation-publish-3.json`: successful live `OBSERVATION` publish using Treasury FiscalData rates.
- `pending-verdicts.json`: delayed verdict queue entry for the successful live publish.

Successful live publish:

- category: `OBSERVATION`
- tx: `078b869d27cdc8d993ecd1796fd29b17423cfe94568aa5b11745f38caf57ba17`
- attestation tx: `a4196ec6f4032e882e9a7f283df2f1057b837730474fc8b417be3437f001c1a7`
- source: Treasury FiscalData average interest rates
- queued delayed verdict: `2026-04-22T11:45:17.499Z`
