---
summary: "9st0.7 no-spend controlled chat-send readiness design and successor exclusion."
owner_bead: "omniweb-agents-9st0.7"
status: "excluded"
date: "2026-05-23"
---

# 9st0.7 Chat Send Readiness

Verdict: `EXCLUDED`

Do not include chat-send in the next successor live-proof packet.

This bead did not send a chat message, spend DEM, broadcast, upload, mutate
credentials, mutate profile state, or run a live chat probe.

The maintained package surface still models `chat.message.send` as a remote
mutation plan only. The prior gate artifact records `executionGate:
explicit_execute_required`, `canExecuteNow: false`, and
`execute_requested_but_not_implemented_by_consumer_plan`. The broader inventory
also classifies SuperColony chat reads as auth-gated and chat mutations as
blocked until controlled target, cleanup, and readback exist.

## Evidence

- JSON artifact: [chat-send-readiness.json](./chat-send-readiness.json)
- Prior gate report:
  [0ctx-controlled-proof-run-2026-05-23/chat-gate-report.md](../0ctx-controlled-proof-run-2026-05-23/chat-gate-report.md)
- Prior gate preview:
  [0ctx-controlled-proof-run-2026-05-23/chat-gate-preview.json](../0ctx-controlled-proof-run-2026-05-23/chat-gate-preview.json)
- Inventory baseline:
  [identity-attestation-messaging-network-crypto-inventory-2026-05-22.md](../identity-attestation-messaging-network-crypto-inventory-2026-05-22.md)

## Controlled Target Contract

A future chat-send proof needs a room target before any mutation:

- dedicated controlled test room or operator-owned private room
- stable room id read through `createClient().getChatRooms`
- explicit credential target used for both pre-read and send
- known limited membership
- documented retention, expiry, or cleanup behavior

Disallowed targets:

- public rooms or production user-facing rooms
- rooms selected only by display name
- rooms containing unrelated users or private operational history
- any room that requires credential or profile mutation to access

Current state: no controlled room id or ownership evidence exists.

## Cleanup Policy

No chat message delete endpoint is modeled in the maintained package surface.
Until a delete or TTL path is proven, cleanup must be treated as an
acceptable-retention decision rather than assumed deletion.

Minimum future policy:

- prefer a dedicated disposable room whose contents may persist
- if platform TTL exists, record the TTL and expiry readback before send
- if no delete or TTL exists, send only harmless self-identifying test text
- never depend on undeclared message deletion as cleanup

Current state: no cleanup, expiry, or acceptable-retention policy is proven.

## Owned Message Id Strategy

Use a client nonce to bind the sent message to the proof:

```text
omniweb-agents-9st0.7:<utc-compact>:<git-short-sha>
```

The message body must include that nonce exactly once, include owner bead
`omniweb-agents-9st0.7`, and contain no secrets, credentials, private room
history, user PII, or operational tokens.

Preferred identity is the server-returned message id. If no message id is
returned, the fallback identity is controlled room id plus exact nonce readback
from `createClient().getChatMessages`.

Current state: strategy designed, not implemented in a maintained probe.

## Execute Gate

A future probe must stop unless all of these are present:

- `--execute`
- `--confirm-chat-mutation`
- `--room-id <controlled-room-id>`
- `--client-nonce <owned-nonce>`
- `--proof-out <artifact-path>`
- explicit credential target
- cleanup or acceptable-retention policy
- post-send readback plan

Current state: no maintained execute-gated chat-send probe exists.

## Readback Contract

Minimum future readback:

1. Pre-read `getChatMessages` for the controlled room and record only sanitized
   cursor/count shape.
2. Send exactly one message with the owned client nonce.
3. Post-read `getChatMessages` for the same room until the returned message id
   or exact client nonce appears.
4. Record the bounded polling window, final verdict, and sanitized response
   shape.
5. If delete or expiry exists, prove cleanup or expiry readback. If not, the
   controlled room policy must already allow a persistent harmless test message.

Success requires the message to appear in the controlled room, the sender to
match the explicit credential target, and the artifact to avoid unrelated room
content or credential material.

Current state: no post-send readback lane is proven.

## Successor Decision

Record chat-send as `EXCLUDED` for `omniweb-agents-9st0.9` aggregation.

Re-open the lane only after a no-spend room/readback fixture and maintained
execute-gated probe exist. Until then, chat-send is a designed future contract,
not successor live authority.
