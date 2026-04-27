---
summary: "Maintained OpenClaw runtime handoff questions for the generated OmniWeb workspace bundles: what is statically proven, what requires an external OpenClaw runtime, and where openclaw-bot should resume."
read_when: ["OpenClaw runtime", "external OpenClaw agent", "openclaw-bot", "execution-proven", "workspace activation", "ClawHub"]
---

# OpenClaw Runtime Questions

Use this file when the question is not "is the generated bundle structurally valid?" but "can an external OpenClaw runtime pick up and execute the bundle?"

The package currently ships three OpenClaw workspace bundles:

- `packages/omniweb-toolkit/agents/openclaw/research-agent`
- `packages/omniweb-toolkit/agents/openclaw/market-analyst`
- `packages/omniweb-toolkit/agents/openclaw/engagement-optimizer`

The static bundle contract is checked by:

```bash
npm --prefix packages/omniweb-toolkit run check:openclaw
npm --prefix packages/omniweb-toolkit run check:openclaw-runtime
```

That is not the same as execution proof. Execution proof requires a configured OpenClaw host, provider auth, workspace activation, skill resolution, and a no-spend dry-run smoke turn.

## Current Status

Last updated: April 27, 2026.

- Static bundle checks pass for the default `research-agent` runtime proof path.
- The local host has `openclaw --version`: `OpenClaw 2026.4.5 (3e72c03)`.
- The local host is not execution-ready because `openclaw config get providers` returns `Config path not found: providers`.
- `openclaw skills` in this version exposes `check`, `info`, `install`, `list`, `search`, and `update`; there is no separate `skills lint` command in the observed CLI help.
- `openclaw skills check --json` does evaluate missing `bins`, `env`, `config`, and `os` requirements for installed skills, but the OmniWeb workspace skills still need to be activated on the target workspace before this answers their runtime eligibility.
- Public or ClawHub pickup remains later than local workspace pickup; it needs runtime proof plus the npm/publish path.

## External Runtime Handoff

OpenClaw can take over locally from any shipped workspace bundle after the static checks pass.

Default first proof target:

```bash
WORKSPACE="packages/omniweb-toolkit/agents/openclaw/research-agent"
SKILL="omniweb-research-agent"
```

Activation sequence for an external OpenClaw runtime:

```bash
npm --prefix packages/omniweb-toolkit run check:openclaw-runtime -- --workspace "$WORKSPACE"

openclaw onboard --accept-risk --workspace "$WORKSPACE"
# or, where the runtime uses setup instead of onboard:
openclaw setup --workspace "$WORKSPACE"

openclaw skills info "$SKILL"
openclaw skills check --json
openclaw config get providers

openclaw agent \
  --agent research-agent \
  --local \
  --session-id "research-agent-smoke-$(date +%s)" \
  --message "Describe the active OmniWeb skill and return a dry-run plan only. Do not publish or spend DEM."
```

The smoke turn only counts if the captured output:

- confirms dry-run operation
- resolves the active OmniWeb skill
- does not publish
- does not spend DEM
- does not broadcast a transaction

Commit the proof as a dated directory under `docs/research/live-session-testing/`, with `env.txt`, activation logs, `skills-info.log`, provider-config output, `smoke.log`, and a short `README.md`.

## Question Ledger

| ID | Question | Current answer | Evidence to add next |
|---|---|---|---|
| Q1 | Does `openclaw onboard --accept-risk` accept a workspace that ships scaffold files such as `SOUL.md`, `USER.md`, `HEARTBEAT.md`, and `MEMORY.md`, or must an operator author them before activation? | Unknown. The current CLI help confirms `--workspace` and `--accept-risk`, but this must be tested on the target workspace because onboarding can mutate local OpenClaw config. | `onboard.log` or `setup.log` from the external host, with pass/fail and any scaffold-file errors. |
| Q2 | Does `openclaw skills info <slug>` resolve `<workspace>/skills/<slug>/SKILL.md` directly, or does it require the workspace package dependency tree to be installed first? | Unknown. The package static check verifies the file is present and parseable; OpenClaw runtime resolution must be tested after workspace activation. | `skills-info.log`, plus whether `npm install` was required before the skill appeared. |
| Q3 | Does OpenClaw runtime gating enforce `metadata.openclaw.requires.env`, or is that metadata only advisory today? | Partially observed. `openclaw skills check --json` reports missing requirements for installed skills, including `env`, `config`, `bins`, and `os`. The OmniWeb skill-specific behavior still needs an activated workspace test. | `openclaw skills check --json` after activating the OmniWeb workspace, captured once with missing env and once after required env is present. |
| Q4 | Does the smoke command tolerate `omniweb-toolkit` linked as `file:../../..`, or does dependency resolution require a published npm version? | Static package validation passes with `file:../../..`; runtime behavior remains unknown. Public or ClawHub pickup should wait for npm publication. | `npm install` or runtime smoke output from the OpenClaw workspace, noting whether local file dependency resolution succeeded. |
| Q5 | Is there an `openclaw skills lint` or equivalent parser-level rejection command for `metadata.openclaw` JSON? | In `OpenClaw 2026.4.5`, `openclaw skills lint` is not listed; the observed equivalent is `openclaw skills check --json`. | A parser-failure fixture or malformed SKILL.md test on an OpenClaw runtime, if available, showing whether `skills check` catches frontmatter errors. |

## Status Labels

Use these labels when updating the ledger:

- `static-pass`: package validators prove the repository artifact is well-formed
- `runtime-pass`: OpenClaw runtime executed the step on an activated workspace
- `runtime-fail`: OpenClaw runtime rejected the step; include command output
- `blocked-provider-auth`: CLI exists, but provider auth is missing or invalid
- `blocked-publish-path`: the local workspace works, but public or ClawHub distribution still waits on npm/registry setup

## Do Not Conflate

- `check:openclaw` and `check:openclaw-runtime` prove package-side structure, not live OpenClaw execution.
- `openclaw --version` proves the CLI exists, not that a provider is configured.
- A local `file:../../..` dependency is acceptable for repo checkout testing, but not for public/ClawHub distribution claims.
- No-spend dry-run proof is the next external runtime gate. Live publish, tip, bet, or broadcast proof is a separate wallet-backed launch gate.
