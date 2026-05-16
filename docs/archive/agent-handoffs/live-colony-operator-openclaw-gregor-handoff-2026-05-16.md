# Live Colony Operator OpenClaw/Gregor Handoff

**Date:** 2026-05-16
**Parent bead:** `omniweb-agents-8tga`
**External gate:** `omniweb-agents-aick`
**Scope:** M6a handoff packet for external Gregor/OpenClaw runtime-host proof. Codex owns this packet only; Gregor/OpenClaw owns runtime-host execution evidence.

## Current Local Proofs To Preserve

- M3 live maintained operator publish proof passed from this branch. Proof packet: `/tmp/omni-live-colony-operator-m3-v2/live-operator-proof.json`.
- M4 live higher/lower pool proof passed from this branch. Command wrote BTC 24h LOWER, tx `30fc92bca4cf5585302c78ac0363dba0176f2b78a4e20fe43b8ff750c1dde3d1`, and pool readback moved `totalLower 0 -> 5`, `totalDem 0 -> 5`, `lowerCount 0 -> 1`.
- M5 identity live mutation is blocked until an operator explicitly authorizes identity register/link/unlink. The dry-run probe confirmed wallet `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b` and did not persist secrets.

These local proofs do not close the external runtime gate. The gate needs an actual OpenClaw/Gregor host to activate the colony-operator workspace and run a no-spend smoke turn as that workspace.

## Runtime Target

Use this repository checkout on the runtime host:

```bash
git fetch origin
git checkout codex/live-colony-goal-run-main
git pull --ff-only
npm install
```

Workspace bundle:

```bash
packages/omniweb-toolkit/agents/openclaw/colony-operator
```

Skill slug:

```bash
omniweb-colony-operator
```

## Environment Requirements

Required tools:

```bash
node --version
npm --version
openclaw --version
```

Expected environment shape for runtime smoke:

- `DEMOS_MNEMONIC` is available only as host env, keyring, or OpenClaw-injected primary env.
- `RPC_URL` points at the intended Demos RPC.
- `SUPERCOLONY_API` points at the intended SuperColony API.
- No mnemonic, bearer token, challenge secret, approval token, private operator note, or raw provider config should be copied into logs or committed artifacts.

OpenClaw onboarding may materialize workspace-local files such as `AGENTS.md`, `TOOLS.md`, `SOUL.md`, `USER.md`, `HEARTBEAT.md`, `MEMORY.md`, and `.openclaw/workspace-state.json`. Treat those as runtime outputs unless the repo maintainers intentionally export them later.

## Package-Side Preflight

Run from the repo root:

```bash
npm --prefix packages/omniweb-toolkit run check:openclaw-runtime -- --archetype colony-operator --workspace agents/openclaw/colony-operator
npm --prefix packages/omniweb-toolkit run check:colony-operator-consumer
```

Expected:

- `check:openclaw-runtime` exits 0 and reports the workspace, `openclaw.json`, and `skills/omniweb-colony-operator/SKILL.md` as present and parseable.
- `check:colony-operator-consumer` exits 0 and proves the copied-bundle outside-in no-spend path.

These commands are static/package evidence only. They do not count as external runtime-host proof.

## OpenClaw Activation Commands

Use an isolated profile so this proof does not mutate a default operator profile:

```bash
export WORKSPACE="$PWD/packages/omniweb-toolkit/agents/openclaw/colony-operator"
export SKILL="omniweb-colony-operator"
export PROFILE="colony-operator-m6b-$(date +%Y%m%d%H%M%S)"

openclaw --profile "$PROFILE" onboard \
  --non-interactive \
  --accept-risk \
  --mode local \
  --workspace "$WORKSPACE" \
  2>&1 | tee /tmp/openclaw-colony-onboard.log
```

If the installed OpenClaw build requires setup instead of onboard, run:

```bash
openclaw --profile "$PROFILE" setup \
  --workspace "$WORKSPACE" \
  2>&1 | tee /tmp/openclaw-colony-setup.log
```

Then verify the active workspace and skill:

```bash
openclaw --profile "$PROFILE" config set agents.defaults.workspace "$WORKSPACE"
openclaw --profile "$PROFILE" agents add colony-operator-m6b \
  --non-interactive \
  --workspace "$WORKSPACE" \
  --model openai/gpt-5.4 \
  --json \
  2>&1 | tee /tmp/openclaw-colony-agent-add.json
openclaw --profile "$PROFILE" skills info "$SKILL" 2>&1 | tee /tmp/openclaw-colony-skills-info.log
openclaw --profile "$PROFILE" skills check --json 2>&1 | tee /tmp/openclaw-colony-skills-check.json
openclaw --profile "$PROFILE" agents list 2>&1 | tee /tmp/openclaw-colony-agents-list.log
```

Expected:

- `skills info` resolves `omniweb-colony-operator` from the `colony-operator` workspace, not from a default Gregor workspace.
- `agents list` shows the isolated `colony-operator-m6b` agent pinned to the `colony-operator` workspace.
- Any env/provider failure is reported as a runtime blocker, not hidden behind a package-side pass.

## No-Spend Runtime Smoke

Run one no-spend OpenClaw local turn:

```bash
openclaw --profile "$PROFILE" agent \
  --agent colony-operator-m6b \
  --local \
  --session-id "colony-operator-m6b-$(date +%s)" \
  --message "Use the omniweb-colony-operator skill. Read current SuperColony state and return a dry-run plan only. Do not publish, reply, react, tip, vote, bet, register identity, link identity, spend DEM, or broadcast a transaction. Include the active workspace path, active skill slug, selected dry-run action family, skipped live-write alternatives, and why this is no-spend." \
  2>&1 | tee /tmp/openclaw-colony-smoke.log
```

Expected:

- The response identifies `omniweb-colony-operator`.
- The response identifies the active workspace as `packages/omniweb-toolkit/agents/openclaw/colony-operator` or its absolute equivalent on the host.
- The response remains no-spend and dry-run.
- The response does not publish, reply, react, tip, vote, bet, register identity, link identity, spend DEM, or broadcast any transaction.
- If the runtime cannot run because provider auth is missing, model auth is missing, or workspace activation routes to the wrong workspace, capture that exact blocker.

## Returned Evidence Contract For `omniweb-agents-aick`

Return a dated evidence directory or attached archive containing:

- `env.txt` with tool versions, OS, repo commit, profile name, and redacted env-presence booleans only.
- `package-openclaw-runtime.json` from `check:openclaw-runtime`.
- `package-consumer.log` from `check:colony-operator-consumer`.
- `onboard.log` or `setup.log`.
- `agent-add.json`.
- `skills-info.log`.
- `skills-check.json`.
- `agents-list.log`.
- `smoke.log`.
- `README.md` summarizing pass/fail, exact blocker if any, and whether any workspace-local files were materialized.

The external gate can pass only if runtime-host evidence proves workspace activation plus the no-spend smoke turn. A package-side static pass, local Codex run, or tx/product proof outside OpenClaw does not satisfy M6b.

## Cleanup

After evidence is captured:

```bash
openclaw --profile "$PROFILE" agents list
rm -rf /tmp/openclaw-colony-*.log /tmp/openclaw-colony-*.json
git status --short
```

Do not commit generated OpenClaw runtime files unless the maintainers explicitly decide to export them as package artifacts.
