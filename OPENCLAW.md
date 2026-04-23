# OpenClaw Quickstart

Use this file when you want to run the shipped OmniWeb archetypes inside OpenClaw from a checked-out GitHub repo.

## Current Truth

- **Local/operator onboarding works today** from the generated bundle directories under `packages/omniweb-toolkit/agents/openclaw/`.
- **ClawHub-style install is not the primary path yet.** The registry-facing artifacts under `packages/omniweb-toolkit/agents/registry/` are structurally ready, but they become a truthful public install path only after the first npm publish of `omniweb-toolkit`.
- **GitHub URL alone is not the onboarding contract.** The real path is: clone repo -> pick a bundle directory -> point OpenClaw at that workspace.

## Pick A Bundle

From the repo root, choose one of:

- `packages/omniweb-toolkit/agents/openclaw/research-agent`
- `packages/omniweb-toolkit/agents/openclaw/market-analyst`
- `packages/omniweb-toolkit/agents/openclaw/engagement-optimizer`

Each directory is a real OpenClaw workspace bundle with:

- `openclaw.json`
- `IDENTITY.md`
- `package.json`
- `skills/<slug>/SKILL.md`
- `PLAYBOOK.md`
- `strategy.yaml`
- starter files

## Local Install Path

Start from a fresh clone:

```bash
git clone https://github.com/mj-deving/omniweb-agents.git
cd omniweb-agents
npm install
```

Choose a bundle:

```bash
export BUNDLE_DIR="$PWD/packages/omniweb-toolkit/agents/openclaw/research-agent"
```

### First-Time OpenClaw Profile Setup

If this is a cold OpenClaw profile, use `onboard`:

```bash
openclaw onboard --accept-risk --workspace "$BUNDLE_DIR"
```

Important:

- the cold-start CLI path is `openclaw onboard`, not just `openclaw setup`
- if you need a fully non-interactive first-time setup, OpenClaw currently still requires explicit risk acknowledgement
- in the verified 2026-04-23 onboarding run, `openai-codex` setup was **interactive-only**

### Already-Configured Profile

If your OpenClaw profile already exists and you only need to repoint it at this workspace, either:

```bash
openclaw setup --workspace "$BUNDLE_DIR"
```

or the lower-level config path:

```bash
openclaw config set agents.defaults.workspace "$BUNDLE_DIR"
```

### Add An Isolated Agent

The clean operator path is to add an isolated agent against the bundle:

```bash
openclaw agents add research-omniweb \
  --non-interactive \
  --workspace "$BUNDLE_DIR" \
  --model openai/gpt-5.4
```

Adjust the agent id and model for the bundle you chose.
Make sure the chosen model already has working provider auth in the target OpenClaw profile before expecting the first local turn to succeed.

## Verify The Skill

Use the specific skill lookup, not the noisy global table:

```bash
openclaw skills info omniweb-research-agent
```

For the other bundles:

- `openclaw skills info omniweb-market-analyst`
- `openclaw skills info omniweb-engagement-optimizer`

What you want to see:

- `Source: openclaw-workspace`
- `Path: .../packages/omniweb-toolkit/agents/openclaw/<archetype>/skills/<slug>/SKILL.md`
- requirements satisfied for at least `node`

`openclaw skills list` is useful for a broad inventory, but it is not the best primary check for a local workspace skill.

## Run A Local Turn

Once the workspace and agent are wired:

```bash
openclaw agent \
  --agent research-omniweb \
  --local \
  --message "Summarize the current OmniWeb research-agent skill and workspace you are using."
```

## Auth Caveat

A wired workspace is not the same thing as a runnable local turn.

Current observed behavior:

- the workspace skill resolves correctly from the local bundle
- a new isolated agent can still fail at turn time if its provider auth store is empty
- on the verification run, the first local turn failed on missing auth for `openai/gpt-5.4`
- `openai-codex` exists as an OpenClaw auth choice, but its setup path is currently interactive-only

So the real split is:

1. workspace onboarding
2. model/provider auth
3. local turn execution

Do not document this repo as pure clone-and-go until all three are proven in one path.

## Workspace Mutation

The exported OmniWeb bundles already commit several workspace context files on purpose:

- `AGENTS.md`
- `BOOTSTRAP.md`
- `SOUL.md`
- `USER.md`
- `TOOLS.md`
- `HEARTBEAT.md`
- `MEMORY.md`
- `memory/README.md`

Keep those files as part of the shipped bundle surface.

On first wiring, OpenClaw may also materialize runtime-local files such as:

- `.openclaw/workspace-state.json`

Treat the runtime-local files as generated state, not as source-controlled bundle inputs.

## Future Public Install Path

For future ClawHub/public distribution:

- see `packages/omniweb-toolkit/agents/registry/`
- keep GitHub clone + local workspace as the truthful path today
- only advertise one-command public install after npm publish is real

## Related Surfaces

- [packages/omniweb-toolkit/agents/openclaw/README.md](packages/omniweb-toolkit/agents/openclaw/README.md)
- [packages/omniweb-toolkit/agents/registry/README.md](packages/omniweb-toolkit/agents/registry/README.md)
- [packages/omniweb-toolkit/README.md](packages/omniweb-toolkit/README.md)
