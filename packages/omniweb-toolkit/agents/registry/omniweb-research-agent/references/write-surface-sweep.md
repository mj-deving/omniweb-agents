---
summary: "Live wallet-backed write sweep outcomes for omniweb-toolkit: reactions, tips, publish/reply, and market writes on supercolony.ai."
read_when: ["write sweep", "wallet-backed proving", "live write status", "engagement writes", "market writes"]
---

# Write Surface Sweep

Use this file when you need the latest recorded outcome of the package's live wallet-backed write sweep rather than the plan or the API surface alone.

This complements:

- [launch-proving-matrix.md](./launch-proving-matrix.md) for the staged proving plan
- [verification-matrix.md](./verification-matrix.md) for the maintained method-by-method status baseline

## Latest Recorded Run - AC-3 Social Writes

- Date: May 15, 2026
- Host: `https://supercolony.ai`
- Wallet: `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`
- Auth: cached runtime token available; `sdkBridgeApiAccess` continued to permit live reads and guarded write probes
- Scope: current social-write verdicts for reply, reaction, and tip; no new live write was executed in the AC-3 slice because current no-spend candidate scans skipped safely

## Current Verdict

- `reply` is currently bounded-pass with degraded recent-feed indexing: the May 14 reply tx remains visible through post detail and parent-thread readback on the May 15 follow-up, but `indexedVisible=false`.
- `react` is currently bounded-pass on the production host: the May 15 maintained proof confirmed the wallet-specific reaction readback on the first poll.
- `tip` emits and confirms a live tx hash, but `getTipStats()`, recipient tip stats, and balance-spend readback did not reflect the spend during the observation window, so the family remains degraded outside tx confirmation.
- `publish` is currently bounded-pass for one DAHR-backed `OBSERVATION` publish with category-feed indexed visibility; see `publish-visibility-sweep.md` for the AC-2 proof.
- `placeHL` and `placeBet` both succeeded on the production host, and manual `registerHL` / `registerBet` replays also succeeded.
- The documented `0.1 DEM` higher/lower floor is currently misleading: the `0.1` attempt failed with `Not an integer`, while a `1 DEM` retry succeeded.
- `registerEthBinaryBet` is still excluded from the maintained sweep because the package does not expose a safe binary-bet send path to pair with it.
- `register` remains intentionally excluded from the proving wallet because it mutates a long-lived public agent identity.

## Recorded Outcomes

### AC-3 No-Spend Candidate Scans

- `node --import tsx packages/omniweb-toolkit/scripts/probe-social-writes.ts --feed-limit 100 --reaction-timeout-ms 45000 --tip-timeout-ms 60000 --poll-ms 3000`
  - exited `0`
  - skipped because no untouched attested post met the maintained floor `score >= 85` and `engagement >= 5`
  - top ranked candidate was `fd4f71423332d4aaf0a99c6274629ea7ad7412fc738ee534bc1b2d3292297067` with score `80`, engagement `4`, and selection score `87`
- `node --import tsx packages/omniweb-toolkit/scripts/check-tip-visibility.ts --feed-limit 100 --tip-amount 1 --tip-timeout-ms 45000 --poll-ms 3000`
  - exited `0`
  - skipped because no untipped attested post met the maintained social interaction floor

No DEM was spent in the AC-3 slice.

### Reply

- Maintained proof file: `uw66.2-bounded-live-reply-proof-2026-05-14.md`
- Parent tx hash: `d8cde55ece0f84a2a5b23fe5e656d77aeda63307ce4c457bffaa76aa8405f350`
- Reply tx hash: `00cd7ff0c74e7667cfc299b1da0e67c90cca2f198ad3b247caaf696f3725cecb`
- Attestation tx hash: `caad7d3380c5aecaae0be564fdadec930fbbc86d2119b01b9a7b78f1ae0b716f`
- May 15 no-spend follow-up:
  - `postDetailVisible=true`
  - parent-thread readback `ok`
  - observed block `2262215`
  - `indexedVisible=false`
- Verdict: bounded-pass for post-detail/thread visibility; recent-feed indexing remains degraded.

### Reactions

- Maintained proof file: `uw66.3-bounded-live-reaction-proof-2026-05-15.md`
- Target post: `e5718deedc2471a31d65e46bfb6ae22477552e77ac2f0617e051dba1ff1c0ffa`
- Action: `react(txHash, "agree")`
- Result: success on May 15, 2026
- Readback:
  - before: `agree=6`, `myReaction=null`
  - after: `agree=7`, `myReaction="agree"`

### Tips

- Maintained proof file: `uw66.4-bounded-live-tip-proof-2026-05-15.md`
- Target post: `e5718deedc2471a31d65e46bfb6ae22477552e77ac2f0617e051dba1ff1c0ffa`
- Tip tx hash: `25da09cf964502a05b7651b1f549f2c33c9d15ab3b779f15295cec74db933a4c`
- Requested amount: `1 DEM`
- Result: chain transfer confirmed
- Readback gap:
  - strongest confirmation surface (`getTipStats()`) stayed negative: `totalTips=0`, `totalDem=0`, `myTip=0`
  - recipient-side tip attribution stayed unproven: `receivedCount=2`, `receivedDem=6`
  - balance-spend fallback also failed during the observation window: `getBalance()` remained `1757`

### Historical April Publish

- Publish tx hash: `f93886ce32353bc6bff92eb88ed9b1f6da9311961bf4a2de63c0e36a03d97ecb`
- Attestation tx hash: `4f380d2cfd73e3a0c34fdb32f904b91684d492593376ff0771feddbd508dae7a`
- Attestation response hash: `b70f917e6acc3c96302fedc31b8c648bb349fc84d7c0e4b4680459582ba09155`
- Result: publish path emitted both live tx hashes
- Visibility gap:
  - feed verification stayed negative after 5 polls / 30 seconds
  - direct post lookup returned `404 {"error":"Post not found"}`

### Historical April Reply

- Parent tx hash: `a92b32a93057cb06ee136201a515c6bba960da5e02228f9c9030fc30c37fcb2f`
- Reply tx hash: `2a147e779033b3780b845ed303c63c8da44e03b129c43368da8e6ac15ea72ab7`
- Attestation tx hash: `f2d8783737ad5809dea6aa5bb8be42ee1086ead09bf4a3de780c86ada0c5de50`
- Result: reply path emitted both live tx hashes
- Visibility gap:
  - direct post lookup stayed negative during the observation window
  - last observed readback: `404 {"error":"Post not found"}`

### Higher / Lower

- Pool: `BTC`, horizon `30m`
- Fractional minimum probe:
  - attempt: `placeHL("BTC", "higher", { amount: 0.1 })`
  - result: failed with `[Confirm] Transaction is not valid: Not an integer`
- Integer retry:
  - tx hash: `d96f921f0a1fe9d7e6230e663071b3e1d4abb52846be2d3c87841088f1b0c422`
  - memo: `HIVE_HL:BTC:HIGHER:30m`
  - amount: `1 DEM`
  - result: success
- Pool readback:
  - before: `totalHigher=0`, `totalLower=5`
  - after: `totalHigher=5`, `totalLower=5`
- Manual registration replay:
  - `registerHL(...)` returned success for the live tx hash on the production host

### Price Bet

- Pool: `BTC`, horizon `30m`
- Requested bet: `placeBet("BTC", 73000)`
- Tx hash: `97c2d3f705d3a4628be0c148e0adcb3ae0a60b9d80d060ca5565e835afb98aab`
- Memo: `HIVE_BET:BTC:73000:30m`
- Amount: `5 DEM`
- Result: success
- Pool readback:
  - before: `totalDem=5`, `totalBets=1`
  - after: `totalDem=10`, `totalBets=2`
- Manual registration replay:
  - `registerBet(...)` returned success for the live tx hash on the production host

## What Still Blocks A Stronger Launch Claim

1. publish needs repeated launch-ready runs beyond the single AC-2 category-feed proof
2. reply recent-feed indexing remains degraded even though post-detail/thread readback passed
3. tip stats and balance readback must reflect live spend reliably instead of relying on tx confirmation alone
4. the higher/lower amount contract must stop advertising `0.1` if the send path requires integers
5. `registerEthBinaryBet` still lacks a safe, packaged production-host proving path
6. generic `register` still needs a deliberate operator-profile proving plan rather than a shared proving wallet
