---
summary: "No-spend successor unblock runway after sc96 readiness stayed blocked."
---

# Successor Controlled Proof Unblock Runway

Status: `ACTIVE_NO_SPEND_PREP`

Owner epic: `omniweb-agents-9st0`

Date: `2026-05-23`

## Decision

Do not start a successor controlled live-proof packet yet.

The sc96 hardening children are complete, but the no-spend readiness packet is
still not green enough for live successor authority:

- raw transfer is preview-green only under the explicit integer DEM contract
- escrow is `DEGRADED` because the existing controlled tx is confirmed but
  claimable/balance readback wrappers still degrade
- IPFS is `BLOCKED` because the maintained quote path still returns
  `Unknown message`

This runway creates enough no-spend work for agents to continue without
stopping after one tiny truth-sync slice. It is not live authority.

## Beads Graph

| Bead | Purpose |
|---|---|
| `omniweb-agents-9st0` | parent successor unblock epic |
| `omniweb-agents-9st0.1` | sync roadmap and re-entry mirrors |
| `omniweb-agents-9st0.2` | audit raw transfer integer contract |
| `omniweb-agents-9st0.3` | resolve escrow readback policy for existing tx |
| `omniweb-agents-9st0.4` | resolve IPFS quote path or successor exclusion |
| `omniweb-agents-9st0.5` | classify TLSN readiness without proof spend |
| `omniweb-agents-9st0.6` | refresh social target policy before mutation |
| `omniweb-agents-9st0.7` | design controlled chat-send target/readback |
| `omniweb-agents-9st0.8` | design controlled webhook target/readback |
| `omniweb-agents-9st0.9` | aggregate no-spend successor readiness |
| `omniweb-agents-9st0.10` | prepare successor packet only if readiness qualifies |

Dependency shape:

1. `9st0.1` lands the shared docs/packet truth first.
2. `9st0.2` through `9st0.8` can run as parallel no-spend children after
   `9st0.1`.
3. `9st0.9` waits for those children and records the go/no-go readiness packet.
4. `9st0.10` waits for `9st0.9` and either authors a successor packet or records
   a blocked decision.

## Hard Boundaries

No child in this runway may perform any of the following unless a later,
explicit successor packet authorizes it:

- live spend
- broadcast
- upload
- mainnet or real-money action
- npm release or public registry proof
- production hosted activation
- secret handling change
- uncontrolled credential or profile mutation

Wallet-backed no-spend probes must use the existing explicit target
`--agent-name colony-operator` unless a child records a safer explicit target.

The nominal ledger remains `10.1 / 25` testnet DEM until a successor packet
explicitly updates it.

## Minimum Exit Criteria

The runway is ready to decide on a successor packet only when `9st0.9` records:

- transfer: integer DEM preview remains satisfiable and fractional behavior is
  explicitly blocked or base-unit conversion is proven
- escrow: the existing tx
  `2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1` is
  classified as `GREEN`, `DEGRADED`, `STUCK`, or `BLOCKED` with reason codes
- IPFS: preview returns a concrete fee within budget, or IPFS is explicitly
  excluded with unsupported-runtime evidence
- TLSN, social, chat, and webhook: each is either green enough for inclusion or
  explicitly excluded with target/readback/budget reasons
- the packet recommendation says whether `9st0.10` should create live authority
  or stop

## Start Command

Fresh agents should start with:

```bash
bd ready --json
bd show <ready-child-id> --json
bd update <ready-child-id> --claim --json
```

Work in a clean worktree from `refs/remotes/origin/main`, one bead per branch and
PR. Keep all proof artifacts no-spend unless the final packet decision later
authorizes otherwise.
