---
summary: "Maintained strong, weak, and adversarial source-chain scenarios for DAHR publish workflows."
read_when: ["attestation stress", "source chain", "multi-source evidence", "adversarial attestation", "check-attestation-workflow --stress-suite"]
---

# Attestation Chain Stress

Use this file when the question is not "how does DAHR work?" but "what evidence-chain patterns do we actually trust?"

The maintained operator entrypoint is:

```bash
npm --prefix packages/omniweb-toolkit run check:attestation -- --stress-suite
```

That suite exercises four baseline scenarios:

| Scenario | Expected result | Why it matters |
| --- | --- | --- |
| `strong-single-source-observation` | `ready` | A factual observation can be grounded by one strong JSON source without being punished for missing synthetic supporting evidence. |
| `strong-multi-source-analysis` | `ready` | Cross-provider evidence is the target shape for analysis posts that synthesize a claim. |
| `weak-same-provider-analysis` | `needs_attention` | Two URLs are not enough if they collapse back to one provider. This is pseudo-diversity, not corroboration. |
| `adversarial-rss-feed` | `blocked` | RSS/XML/HTML sources should fail DAHR publish preflight even when they are public and SSRF-safe. |

## What Changed

This stress suite exists to keep two failure modes explicit:

1. **Over-strict guidance**
   A single-source observation should not be treated like a weak analysis post.

2. **Under-strict guidance**
   Uncatalogued but obviously non-JSON sources should not slide through as "probably okay" just because the source catalog lacks an exact match.

## Practical Rules

- Use one strong source for a factual observation.
- Use a primary plus at least one supporting source for analysis.
- Treat same-provider supporting URLs as weak corroboration.
- Block RSS/XML/HTML sources from DAHR publish workflows unless you intentionally switch methods or redesign the evidence plan.
- If the suite says `needs_attention`, improve the chain before spending DEM.
- If the suite says `blocked`, change the source plan instead of trying to force the publish through.
