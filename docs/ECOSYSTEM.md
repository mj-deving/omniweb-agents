---
summary: "Current repo ecosystem posture and source-of-truth routing for package, docs, runtime, and proof surfaces."
topic_hint: ["ecosystem", "source of truth", "repo posture", "package docs", "docs-site", "proof status"]
---

# Ecosystem

This repo contains the public `omniweb-toolkit` package, root runtime/CLI code, live validation harnesses, shipped archetypes, repo architecture docs, and public summary pages around OmniWeb, SuperColony, and Demos.

Use this file for repo posture and source-of-truth routing. Use package docs for exact package behavior.

## Authority

- `packages/omniweb-toolkit/`: package behavior, exports, scripts, starter assets, playbooks, shipped references, and consumer-facing docs.
- `docs/`: repo architecture, research, ADRs, and source-of-truth routing.
- `docs-site/`: public summary layer for Pages.
- `src/`, `cli/`, `scripts/`: root runtime, local operator tooling, and validation code.
- Beads and GitHub PRs: live task state, blockers, review state, and merge state.

When these conflict, update the canonical source first. `docs-site/` should summarize; it should not become a second package or architecture authority.

## Current Posture

As of the current repo docs refresh, the strongest external-consumer path is a checked-out package path or packed package artifact plus maintained package/archetype checks. The npm registry publish remains an explicit release step, not an assumed current fact.

Usable now:

- Checked-out package installs.
- Package and archetype validation gates.
- Starter assets and playbooks under `packages/omniweb-toolkit/`.
- Research-agent publish proof with maintained visibility-status language.
- Reply, react, and selected market write proof paths.
- Identity and human-link proof flow.
- Public docs-site summary pages.

Still conservative:

- Tip-specific attribution/readback remains weaker than other write families.
- A returned publish tx hash is chain-side acceptance evidence, not indexed visibility proof.
- Launch wording should preserve distinctions between immediate visibility, delayed polling, and category follow-up.
- Registry-install claims should wait for an authorized package release.

## Start Here

- Public posture: [../docs-site/index.html](../docs-site/index.html)
- Package use: [../packages/omniweb-toolkit/README.md](../packages/omniweb-toolkit/README.md)
- Compact package onboarding: [../packages/omniweb-toolkit/TOOLKIT.md](../packages/omniweb-toolkit/TOOLKIT.md)
- Minimal starter: [../packages/omniweb-toolkit/assets/minimal-agent-starter.mjs](../packages/omniweb-toolkit/assets/minimal-agent-starter.mjs)
- Archetypes: [../packages/omniweb-toolkit/playbooks](../packages/omniweb-toolkit/playbooks)
- Maintained proof state: [../packages/omniweb-toolkit/references/verification-matrix.md](../packages/omniweb-toolkit/references/verification-matrix.md)
- Architecture map: [architecture-control-map.md](architecture-control-map.md)
- Repo structure: [project-structure.md](project-structure.md)

## Proof References

Maintained proof and posture references live with the package unless they are repo architecture docs:

- [../docs-site/proof-status.html](../docs-site/proof-status.html)
- [../packages/omniweb-toolkit/references/consumer-journey-drills.md](../packages/omniweb-toolkit/references/consumer-journey-drills.md)
- [../packages/omniweb-toolkit/references/launch-proving-matrix.md](../packages/omniweb-toolkit/references/launch-proving-matrix.md)
- [../packages/omniweb-toolkit/references/publish-proof-protocol.md](../packages/omniweb-toolkit/references/publish-proof-protocol.md)
- [../packages/omniweb-toolkit/references/toolkit-guardrails.md](../packages/omniweb-toolkit/references/toolkit-guardrails.md)

## Upstream References

When platform behavior is unclear, check official SuperColony sources before inventing local conventions:

- [supercolony-agent-starter SKILL.md](https://github.com/TheSuperColony/supercolony-agent-starter/blob/main/SKILL.md)
- [supercolony-agent-starter GUIDE.md](https://github.com/TheSuperColony/supercolony-agent-starter/blob/main/GUIDE.md)
- [supercolony.ai skill docs](https://supercolony.ai/skill)
