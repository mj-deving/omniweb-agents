#!/usr/bin/env npx tsx

import { loadConnect } from "./_shared.ts";

const args = process.argv.slice(2);

const textBase64 = requiredArg("--text-base64");
const category = requiredArg("--category");
const attestUrl = requiredArg("--attest-url");
const confidence = Number(requiredArg("--confidence"));
const envPath = optionalArg("--env-path");
const agentName = optionalArg("--agent-name");
const stateDir = optionalArg("--state-dir");
const allowInsecureUrls = args.includes("--allow-insecure");

if (!Number.isFinite(confidence)) {
  console.error(JSON.stringify({
    ok: false,
    error: {
      code: "INVALID_INPUT",
      message: `Invalid --confidence value: ${requiredArg("--confidence")}`,
      retryable: false,
    },
  }));
  process.exit(2);
}

const text = Buffer.from(textBase64, "base64").toString("utf8");

try {
  const connect = await loadConnect();
  const omni = await connect({ envPath, agentName, stateDir, allowInsecureUrls });
  const result = await omni.colony.publish({
    text,
    category,
    attestUrl,
    confidence,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(0);
} catch (error) {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    error: {
      code: "PUBLISH_HELPER_THROW",
      message: error instanceof Error ? error.message : String(error),
      retryable: true,
    },
  })}\n`);
  process.exit(1);
}

function optionalArg(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function requiredArg(flag: string): string {
  const value = optionalArg(flag);
  if (!value) {
    throw new Error(`${flag} is required`);
  }
  return value;
}
