---
summary: "9st0.8 no-spend webhook receiver target and cleanup readiness decision."
---

# 9st0.8 Webhook Receiver Readiness

Status: `EXCLUDED`

Bead: `omniweb-agents-9st0.8`

Packet: [docs/goalmode/successor-unblock-runway-2026-05-23.md](../../../../docs/goalmode/successor-unblock-runway-2026-05-23.md)

## Decision

Do not include webhook receiver mutation in the successor live packet yet.

The maintained webhook gate still has no controlled public HTTPS callback,
cleanup policy, owned webhook id, create/delete readback, or hosted receiver
activation plan. The current package planner classifies webhook admin operations
as no-spend remote mutation plans that cannot execute now:

- `webhooks.list`: `auth_required`
- `webhooks.create`: `explicit_execute_required`
- `webhooks.update`: `explicit_execute_required`
- `webhooks.delete`: `explicit_execute_required`
- `webhooks.event.receive`: local untrusted input, not remote execution

This is enough to define the future contract, but not enough to authorize a live
webhook receiver lane. The successor packet should treat webhook receiver as
`EXCLUDED` unless the requirements below are satisfied by a later child.

## Required Controlled Contract

A future webhook receiver packet may become eligible only after it records all of
these fields:

- callback: public HTTPS URL owned by this repo or operator, with no embedded
  token or secret
- ownership: deterministic `owned_webhook_id` or unique webhook label/prefix for
  this packet
- create gate: explicit live flag plus a body preview showing callback URL and
  event list before `POST /api/webhooks`
- create readback: authenticated `GET /api/webhooks` showing the owned webhook id
  and exact callback URL
- delivery readback: sanitized receiver log proving an expected test event shape,
  or an explicit reason why delivery is not required for the packet
- delete gate: explicit cleanup flag before `DELETE /api/webhooks/[id]`
- delete readback: authenticated `GET /api/webhooks` showing the owned webhook id
  is absent
- artifacts: no credentials, tokens, callback secrets, private payloads, or full
  Authorization headers

## Stop Rules

Stop before mutation if any of these are true:

- no controlled public HTTPS callback is available
- callback hosting would require production activation not already authorized by
  the packet
- no owned webhook id or deterministic ownership label exists
- create/list/delete readback cannot be captured without leaking credentials
- any command would use broad environment dumps or uncontrolled profile mutation
- the packet budget does not explicitly include webhook receiver mutation

## Reason Codes

- `controlled_callback_missing`
- `cleanup_policy_missing`
- `owned_webhook_id_missing`
- `create_readback_missing`
- `delete_readback_missing`
- `hosted_activation_not_authorized`
- `successor_packet_exclude_webhook_receiver`

## Evidence

Prior controlled packet evidence remains the current maintained no-spend proof:

- [0ctx-controlled-proof-run-2026-05-23/webhook-receiver-gate-report.md](../0ctx-controlled-proof-run-2026-05-23/webhook-receiver-gate-report.md)
- [0ctx-controlled-proof-run-2026-05-23/webhook-receiver-gate-preview.json](../0ctx-controlled-proof-run-2026-05-23/webhook-receiver-gate-preview.json)

The `9st0.8` refresh did not execute create, update, delete, hosted receiver
activation, or inbound delivery against a public callback.

## Commands

No-spend planner refresh:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-webhook-receiver-gate.ts
```

Related chat/webhook consumer gate:

```bash
node --import tsx packages/omniweb-toolkit/scripts/check-chat-webhook-consumers.ts
```

Repository validation:

```bash
git diff --check
```

## Budget

- prior successor ledger: `10.1 / 25` nominal testnet DEM
- webhook receiver budget used: `0 DEM`
- successor recommendation: keep the ledger unchanged and exclude webhook
  receiver from live authority until the controlled contract is complete
