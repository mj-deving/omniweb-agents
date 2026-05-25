---
summary: "PR4 identity/admin mutation proof for full action-spectrum rows I1-I3 and A1, with throwaway wallet provisioning, official link cleanup, webhook gating, and deprecated wrapper verdicts."
read_when: ["action spectrum identity proof", "register human-link webhook", "PR4 identity admin", "wallet mnemonic registration"]
topic_hint:
  - "action spectrum identity proof"
  - "register human-link webhook"
  - "PR4 identity admin"
  - "wallet mnemonic registration"
---

# Full Action Spectrum Identity/Admin Proof - 2026-05-19

Owner bead: `omniweb-agents-action-spectrum.4`

Branch: `codex/action-spectrum-pr4-identity`

Mode: explicitly authorized testnet-only identity/admin mutation lane under Beads memory `action-spectrum-identity-admin-gates`.

## Target

- throwaway agent name: `action-spectrum-pr4-20260519-01`
- throwaway wallet: `0x0b7468ded5583cb02c964d2bb93146b24824fe89db09f4ddefe3054383061f09`
- configured wallet also touched by the maintained script: `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`
- host: `https://supercolony.ai`
- RPC: `https://node3.demos.sh/`
- state dir: `.action-spectrum-state/pr4/agents/action-spectrum-pr4-20260519-01`
- proof dir: `packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr4/`

The throwaway mnemonic lives only in the local credentials file created by `provision-agent-wallets.ts`. Proof files record public addresses and redacted credential markers only. They do not include mnemonics, signatures, challenge handles, challenge messages, auth tokens, or local credential paths.

## Commands

Wallet/mnemonic provisioning:

```bash
node --import tsx packages/omniweb-toolkit/scripts/provision-agent-wallets.ts \
  --prefix action-spectrum-pr4-20260519 \
  --count 1 \
  --start-index 1 \
  --state-root .action-spectrum-state/pr4/agents \
  --out packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr4/wallet-provision.raw.json
```

Throwaway readiness:

```bash
node --import tsx packages/omniweb-toolkit/scripts/check-publish-readiness.ts \
  --agent-name action-spectrum-pr4-20260519-01 \
  --state-dir .action-spectrum-state/pr4/agents/action-spectrum-pr4-20260519-01
```

Maintained identity script guard:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts \
  --phase full \
  --state-dir .action-spectrum-state/pr4/agents/action-spectrum-pr4-20260519-01 \
  --register-name action-spectrum-pr4-20260519-01 \
  --register-description "Throwaway testnet identity for action-spectrum PR4 mutation proof." \
  --register-specialties testing,identity,proof \
  --execute
```

That command refused to run until `--confirm-identity-mutation` was present. The confirmed maintained-script run did execute, but because the script then lacked `--agent-name` / `--env-path`, it used the configured default wallet instead of the throwaway wallet. This is recorded as historical degraded script-surface evidence; the maintained script now refuses live mutation without an explicit existing credential target.

Throwaway identity round trip:

```bash
node --input-type=module --import tsx -e '<throwaway identity roundtrip using connect({ agentName })>'
```

Webhook and deprecated identity-wrapper classification:

```bash
node --input-type=module --import tsx -e '<webhook list and create/delete safety classification using connect({ agentName })>'
node --input-type=module --import tsx -e '<deprecated linkIdentity classification using connect({ agentName })>'
```

## Verdicts

| Row | Verdict | Evidence |
| --- | --- | --- |
| I1 profile register | pass with degraded historical script caveat | Throwaway wallet `0x0b7468ded5583cb02c964d2bb93146b24824fe89db09f4ddefe3054383061f09` submitted `register()` for `action-spectrum-pr4-20260519-01`; the registration response returned the requested public fields, while follow-up profile readback matched the address but returned null/empty public profile fields. The first maintained-script run accidentally registered the configured wallet before script targeting existed; a restore attempt hit SuperColony name-change cooldown `429`, so the default wallet profile remains a documented cleanup blocker until the cooldown expires. Future maintained-script live runs require explicit existing `--agent-name` / `--env-path` targeting. |
| I2 official human-link | pass | Throwaway challenge/claim/approve/readback/unlink completed. Linked-agent readback contained the throwaway address before cleanup and `linkedAfter.count=0`, `containsAgent=false` after unlink. Challenge handles, messages, and signatures are redacted. The configured-wallet maintained-script run also completed link cleanup. |
| I3 deprecated wrapper | unsupported / excluded | `omni.identity.createProof()` produced a redacted proof payload marker, but `linkIdentity` / `omni.identity.link` was not submitted because it requires a public Twitter/GitHub proof URL. PR4 used the official human-link flow instead. |
| A1 webhook create/delete | blocked with read proof | `getWebhooks()` succeeded for the throwaway wallet. `createWebhook` and `deleteWebhook` were not attempted because no controlled public HTTPS callback receiver and no PR4-owned webhook id were available. Creating an unowned callback registration would violate the cleanup/readback gate. |

## Proof Bundle

```text
packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr4/
  wallet-provision.json
  readiness-preflight.json
  configured-wallet-identity-roundtrip.json
  default-wallet-restore.json
  throwaway-identity-roundtrip.json
  webhook-admin-report.json
  deprecated-linkidentity-report.json
```

## Current Truth

The official register and human-link routes are currently live-proven through an isolated throwaway wallet with cleanup readback. The maintained script now accepts `--agent-name` / `--env-path`, reports the selected public address with redacted runtime target metadata, and refuses live identity mutation without an explicit existing credential target. Webhook mutation remains blocked without a controlled callback receiver, and the deprecated Web2 identity wrapper remains excluded from current launch claims.
