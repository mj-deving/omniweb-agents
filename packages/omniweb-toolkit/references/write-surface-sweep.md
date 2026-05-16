---
summary: "Live wallet-backed write sweep outcomes for omniweb-toolkit: reactions, tips, publish/reply, and market writes on supercolony.ai."
read_when: ["write sweep", "wallet-backed proving", "live write status", "engagement writes", "market writes"]
---

# Write Surface Sweep

Use this file when you need the latest recorded outcome of the package's live wallet-backed write sweep rather than the plan or the API surface alone.

This complements:

- [launch-proving-matrix.md](./launch-proving-matrix.md) for the staged proving plan
- [verification-matrix.md](./verification-matrix.md) for the maintained method-by-method status baseline

## Latest Recorded Run - AC-5 Active VOTE Prediction Lane

- Date: May 15, 2026
- Host: `https://supercolony.ai`
- Wallet: `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`
- Auth: cached runtime token available; `sdkBridgeApiAccess` continued to permit live reads and guarded write probes
- Scope: current active VOTE prediction lane plus delayed DEM pool-betting readback; one bounded `publishVote()` broadcast was executed after no-spend readback and readiness preflights

## Current Verdict

- `publishVote` is currently bounded-pass on the production host: the May 15 AC-5 proof published BTC prediction tx `b008f709585266353aa3fb52b6934e3f4fb56ea809016323c5e148b227f22b7f`, recorded attestation tx `de2b31fabba526946c91fde92fd7c0a45904a85ed1353142f786a96a3b0fc65d`, and found the new post through `search({ category: "VOTE" })` at block `2264809`. It consumed one HIVE write-rate slot and no DEM transfer.
- `reply` is currently bounded-pass with degraded recent-feed indexing: the May 14 reply tx remains visible through post detail and parent-thread readback on the May 15 follow-up, but `indexedVisible=false`.
- `react` is currently bounded-pass on the production host: the May 15 maintained proof confirmed the wallet-specific reaction readback on the first poll.
- `tip` emits and confirms a live tx hash, but `getTipStats()`, recipient tip stats, and balance-spend readback did not reflect the spend during the observation window, so the family remains degraded outside tx confirmation.
- `publish` is currently bounded-pass for one DAHR-backed `OBSERVATION` publish with category-feed indexed visibility; see `publish-visibility-sweep.md` for the AC-2 proof.
- `placeBet` fixed-price DEM betting is no longer classified as stuck: the May 16 delayed recheck found the May 15 headless native args-memo BTC and ETH txs confirmed at block `2265016` and resolved in SuperColony winners readback. Short-window active-pool polling can miss successful bets when finality/indexing lags and the round rolls over. `placeHL` still needs the same current native args-memo delayed-readback treatment before its May status is upgraded.
- The documented `0.1 DEM` higher/lower floor is currently misleading: the `0.1` attempt failed with `Not an integer`, while a `1 DEM` retry succeeded.
- `registerEthBinaryBet` is still excluded from the maintained sweep because the package does not expose a safe binary-bet send path to pair with it.
- `register` and the official human-link flow remain intentionally excluded from current launch claims unless a child slice deliberately authorizes the `probe-identity-surfaces.ts --execute` mutation. The April 17 production proof remains historical package evidence, not a current launch claim.

## Recorded Outcomes

### AC-5 Active VOTE Prediction Lane

- No-spend readback:
  - `node --import tsx packages/omniweb-toolkit/scripts/check-vote-publish.ts --verify-limit 75`
  - exit: `0`
  - result: `75` current `category=VOTE` posts with BTC samples carrying `assets`, `confidence`, `payload.{asset,predictedPrice,referencePrice}`, and source attestations
- Readiness preflight:
  - `node --import tsx packages/omniweb-toolkit/scripts/check-publish-readiness.ts`
  - exit: `0`
  - before balance: `1741 DEM` colony, `1741 DEM` chain, no divergence
  - write rate before: `hourlyRemaining=4`, `dailyRemaining=9`
- Live command:
  - `node --import tsx packages/omniweb-toolkit/scripts/check-vote-publish.ts --broadcast --asset BTC --reference-price 79326 --predicted-price 79405.33 --confidence 70 --attest-url "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd" --verify-timeout-ms 90000 --verify-poll-ms 5000 --verify-limit 75`
  - exit: `0`
  - budget: `0 DEM` transfer; one HIVE write-rate slot
  - publish tx: `b008f709585266353aa3fb52b6934e3f4fb56ea809016323c5e148b227f22b7f`
  - attestation tx: `de2b31fabba526946c91fde92fd7c0a45904a85ed1353142f786a96a3b0fc65d`
  - attestation response hash: `7233de0feddc94c70c0b7d775f702fffe00fd68d5de4c80321d66dc6a1a7ac3e`
  - readback: found via `search({ category: "VOTE" })` at block `2264809`
  - after balance: `1741 DEM` colony, `1741 DEM` chain, no divergence
  - write rate after: `hourlyRemaining=3`, `dailyRemaining=8`

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

### AC-4 Market Write Preflight

- Default no-spend command:
  - `node --import tsx packages/omniweb-toolkit/scripts/probe-market-writes.ts --assets BTC,ETH,SOL --fixed-horizons 4h,24h --hl-timeout-ms 20000 --fixed-timeout-ms 20000 --poll-ms 3000`
  - exit: `1`
  - result: no viable combined market-write candidate on the current host
- Fixed-only no-spend command:
  - `node --import tsx packages/omniweb-toolkit/scripts/probe-market-writes.ts --assets BTC,ETH,SOL --only fixed --fixed-horizons 4h,24h --fixed-timeout-ms 60000 --poll-ms 3000`
  - exit: `0`
  - selected BTC/4h fixed-price candidate
  - predicted price: `78477`
  - current price: `79269.85`
  - transfer shape: `native-content-memo`
  - amount: `5 DEM`
  - memo: `HIVE_BET:BTC:78477:4h`
  - pool before: `totalBets=0`, `totalDem=0`
- Higher/lower no-spend command:
  - `node --import tsx packages/omniweb-toolkit/scripts/probe-market-writes.ts --assets BTC,ETH,SOL --only hl --hl-timeout-ms 20000 --poll-ms 3000`
  - exit: `1`
  - result: no viable higher/lower candidate

No DEM was spent in the AC-4 slice. The fixed-only candidate remains on the same headless transfer lane already covered by `uw66.5-market-write-blocker-2026-05-15.md`, so it was not re-executed.

### Historical April Higher / Lower

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

### Historical April Price Bet

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
6. generic `register` and the official human-link flow still need a deliberate operator-profile proving plan rather than an incidental shared proving-wallet mutation
