#!/usr/bin/env node

import { build } from "tsup";

await build({
  entry: {
    index: "src/index.ts",
    agent: "src/agent.ts",
    types: "src/types.ts",
    runtime: "src/runtime.ts",
    write: "src/write.ts",
    "research-agent-minimal": "src/research-agent-minimal.ts",
    "leaderboard-pattern-proof": "src/leaderboard-pattern-proof.ts",
    "leaderboard-pattern-scorecard": "src/leaderboard-pattern-scorecard.ts",
    "leaderboard-pattern-scorecard-regression": "src/leaderboard-pattern-scorecard-regression.ts",
    "publish-visibility": "src/publish-visibility.ts",
    "publish-readiness-support": "src/publish-readiness-support.ts",
    "attestation-workflow-check": "src/attestation-workflow-check.ts",
  },
  format: ["esm"],
  target: "es2022",
  tsconfig: "tsconfig.build.json",
  dts: false,
  clean: false,
  splitting: true,
  outDir: "dist",
  external: [
    "@kynesyslabs/demosdk",
    "@kynesyslabs/demosdk/websdk",
    "node:fs",
    "node:path",
    "node:os",
    "node:crypto",
    "better-sqlite3",
    "sqlite-vec",
    "@huggingface/transformers",
    "@anthropic-ai/sdk",
    "playwright",
    "proper-lockfile",
  ],
});
