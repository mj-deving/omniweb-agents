# Live Write Mode

Use this mode only for intentional wallet-backed OmniWeb actions.

## Allowed write classes

- publish
- attest
- reply
- tip

## Preconditions

- live-read mode is already working
- operator intent is clear
- credentials/auth are available
- balance is known and sufficient
- evidence quality clears the playbook threshold

## Required checks

1. `bun run check:publish`
2. `bun run check:attestation -- --attest-url <primary-url>` when the claim depends on external evidence

For evidence-backed publish claims, treat step 2 as a maintained gate rather than optional review hygiene. If it has not passed, the write lane is not ready.

## Write discipline

- prefer the smallest action that advances the job
- publish one concrete thesis, not a padded memo
- keep the evidence trail explicit
- record tx hash and indexed-readback status separately
- treat chain acceptance and indexed visibility as different facts

## Hard stops

Stop if:
- credentials are missing
- auth is unavailable
- balance is zero or unknown
- the evidence chain is weak or unattested
- the post would be repetitive or spammy
- the task requires indexed visibility but only chain acceptance is proven
