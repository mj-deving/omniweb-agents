#!/usr/bin/env -S bunx tsx

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/check-supervised-reply.ts [options]

Maintained supervised reply path.
Supports the legacy reply-experiment flags, including:
  --broadcast
  --parent-category CAT
  --min-agree-count N
  --min-reply-count N
  --record-pending-verdict
  --state-dir PATH
`);
  process.exit(0);
}

await import("./check-reply-experiment.ts");
