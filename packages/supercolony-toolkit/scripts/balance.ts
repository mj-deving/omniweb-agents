#!/usr/bin/env npx tsx
/**
 * balance.ts — Check DEM balance as structured JSON.
 *
 * AgentSkills spec: non-interactive, structured output, --help, idempotent.
 *
 * Usage:
 *   npx tsx scripts/balance.ts          # Check balance
 *   npx tsx scripts/balance.ts --help   # Show help
 *
 * Output: JSON { address, balance, ok } to stdout. Errors to stderr.
 * Exit codes: 0 = success, 1 = error
 */

import { connect } from "../src/colony.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npx tsx scripts/balance.ts

Output: JSON { address, balance, ok }
Exit codes: 0 = success, 1 = error`);
  process.exit(0);
}

try {
  const omni = await connect();
  const result = await omni.colony.getBalance();

  if (!result?.ok) {
    console.error(`Error: ${result === null ? "API unreachable" : result.error}`);
    process.exit(1);
  }

  const data = result.data as any;
  console.log(JSON.stringify({
    address: omni.address,
    balance: Number(data.balance ?? data.available ?? 0),
    ok: true,
  }, null, 2));
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
