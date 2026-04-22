#!/usr/bin/env npx tsx

import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

import { Demos } from "@kynesyslabs/demosdk/websdk";

import { ensureAuth } from "../../../src/lib/auth/auth.js";
import { getStringArg, hasFlag } from "./_shared.ts";

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/provision-agent-wallets.ts [options]

Options:
  --prefix NAME            Agent-name prefix (default: sweep)
  --count N                Number of identities to create (default: 3)
  --start-index N          Starting numeric suffix (default: 1)
  --rpc-url URL            Override RPC URL (default: https://demosnode.discus.sh/)
  --state-root PATH        Root directory for per-agent state dirs
  --out PATH               Write JSON inventory to file as well as stdout
  --skip-faucet            Do not request faucet funding
  --skip-auth              Do not warm auth cache
  --force                  Overwrite existing credential files for the generated agent names
  --help, -h               Show this help
`);
  process.exit(0);
}

const prefix = getStringArg(args, "--prefix") ?? "sweep";
const count = getPositiveInt("--count", 3);
const startIndex = getPositiveInt("--start-index", 1);
const rpcUrl = getStringArg(args, "--rpc-url") ?? "https://demosnode.discus.sh/";
const stateRoot = resolve(getStringArg(args, "--state-root") ?? resolve(process.cwd(), "tmp", "multi-agent-state"));
const outputPath = getStringArg(args, "--out");
const skipFaucet = hasFlag(args, "--skip-faucet");
const skipAuth = hasFlag(args, "--skip-auth");
const force = hasFlag(args, "--force");

const demos = new Demos();
await demos.connect(rpcUrl);

const results: Array<Record<string, unknown>> = [];

for (let offset = 0; offset < count; offset += 1) {
  const numericId = startIndex + offset;
  const agentName = `${prefix}-${String(numericId).padStart(2, "0")}`;
  const credentialPath = resolve(homedir(), `.config/demos/credentials-${agentName}`);
  const stateDir = resolve(stateRoot, agentName);

  if (existsSync(credentialPath) && !force) {
    results.push({
      agentName,
      credentialPath,
      stateDir,
      ok: false,
      skipped: true,
      reason: "credentials_exist_use_force",
    });
    continue;
  }

  const mnemonic = demos.newMnemonic();
  const wallet = new Demos();
  await wallet.connect(rpcUrl);
  const address = await wallet.connectWallet(mnemonic);

  mkdirSync(dirname(credentialPath), { recursive: true });
  writeFileSync(
    credentialPath,
    `DEMOS_MNEMONIC="${mnemonic}"\nRPC_URL=${rpcUrl}\nSUPERCOLONY_API=https://supercolony.ai\n`,
    "utf8",
  );
  chmodSync(credentialPath, 0o600);
  mkdirSync(stateDir, { recursive: true });

  let faucet: Record<string, unknown> | null = null;
  if (!skipFaucet) {
    faucet = await requestFaucet(address);
  }

  let auth: Record<string, unknown> | null = null;
  if (!skipAuth) {
    try {
      const token = await ensureAuth(wallet, address);
      auth = {
        ok: token != null,
        cached: token != null,
      };
    } catch (error) {
      auth = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  results.push({
    agentName,
    address,
    credentialPath,
    stateDir,
    faucet,
    auth,
    ok: true,
  });
}

const report = {
  checkedAt: new Date().toISOString(),
  rpcUrl,
  prefix,
  count,
  startIndex,
  stateRoot,
  results,
};

if (outputPath) {
  const resolvedPath = resolve(outputPath);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify(report, null, 2));

async function requestFaucet(address: string): Promise<Record<string, unknown>> {
  try {
    const response = await fetch("https://faucetbackend.demos.sh/api/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json() as Record<string, unknown>;
    return {
      ok: response.ok && !body.error,
      status: response.status,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function getPositiveInt(flag: string, fallback: number): number {
  const raw = getStringArg(args, flag);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
}
