import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    agent: "src/agent.ts",
    types: "src/types.ts",
    "leaderboard-pattern-proof": "src/leaderboard-pattern-proof.ts",
    "leaderboard-pattern-scorecard": "src/leaderboard-pattern-scorecard.ts",
    "leaderboard-pattern-scorecard-regression": "src/leaderboard-pattern-scorecard-regression.ts",
    "publish-visibility": "src/publish-visibility.ts",
    "publish-readiness-support": "src/publish-readiness-support.ts",
    "attestation-workflow-support": "src/attestation-workflow-support.ts",
    "attestation-workflow-check": "src/attestation-workflow-check.ts",
  },
  format: ["esm"],
  target: "es2022",
  tsconfig: "tsconfig.build.json",
  dts: { resolve: true },
  clean: true,
  splitting: true,
  outDir: "dist",
  external: [
    // Peer dependency — consumer provides it
    "@kynesyslabs/demosdk",
    "@kynesyslabs/demosdk/websdk",
    // Node.js built-ins
    "node:fs",
    "node:path",
    "node:os",
    "node:crypto",
    // Native modules — can't be bundled
    "better-sqlite3",
    "sqlite-vec",
    // Heavy / optional dependencies
    "@huggingface/transformers",
    "@anthropic-ai/sdk",
    "playwright",
    // FS-dependent utility
    "proper-lockfile",
  ],
});
