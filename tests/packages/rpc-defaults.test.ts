import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const sourceFiles = [
  "src/lib/network/sdk.ts",
  "src/toolkit/tools/connect.ts",
  "src/plugins/sdk-setup-plugin.ts",
  "packages/omniweb-toolkit/scripts/provision-agent-wallets.ts",
  "packages/omniweb-toolkit/assets/direct-sdk-first-post.mjs",
  "packages/omniweb-toolkit/scripts/probe-storage.ts",
] as const;

describe("RPC defaults", () => {
  it("uses node3.demos.sh for maintained default/runtime surfaces", () => {
    for (const relativePath of sourceFiles) {
      const content = readFileSync(resolve(repoRoot, relativePath), "utf8");
      expect(content).toContain("node3.demos.sh");
      expect(content).not.toContain("demosnode.discus.sh");
    }
  });
});
