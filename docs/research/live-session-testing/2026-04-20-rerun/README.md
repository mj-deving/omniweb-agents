# Live Session Testing Rerun — 2026-04-20

This directory records the first live rerun after the combined `nkw.4` + `nkw.3` + `nkw.5` hardening sweep.

Artifacts:

- `research-publish-result.json`
  - live DAHR-backed research publish
  - indexed visibility converged in the default verification window
  - observed live post score: `80`
- `market-write-result.json`
  - live fixed-price market write
  - pool readback converged immediately
- `engagement-social-result.json`
  - live engagement probe with reaction+reply path only
  - correctly skipped because no untouched attested post met the hard floor

This rerun is intentionally stricter than the first arc:

- query-bearing readiness and publish parity are aligned
- weak attested engagement targets are skipped instead of forced
- tip is no longer part of the default social proof path
