#!/usr/bin/env npx tsx

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-supervised-reply.ts [options]

Maintained operator alias for the supervised reply path.
Supports the same flags as check-reply-experiment.ts, including:
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
