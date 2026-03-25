/**
 * Tests for CLIProvider — the shell-based LLM provider.
 * Covers retry-on-empty-output and basic spawn behavior.
 */

import { describe, it, expect } from "vitest";
import { CLIProvider } from "../src/lib/llm-provider.js";

describe("CLIProvider", () => {
  it("returns stdout from a simple echo command", async () => {
    const provider = new CLIProvider("echo hello");
    // echo ignores stdin but prints "hello"
    const result = await provider.complete("ignored prompt");
    expect(result).toBe("hello");
  });

  it("rejects on non-zero exit code", async () => {
    // bash -c reads stdin fully then exits with code 1
    const provider = new CLIProvider("bash -c 'cat > /dev/null; exit 1'");
    await expect(provider.complete("test")).rejects.toThrow("exited with code");
  });

  it("retries once on empty output then fails", async () => {
    // `cat /dev/null` reads stdin but produces no output
    const provider = new CLIProvider("cat /dev/null");
    await expect(provider.complete("test")).rejects.toThrow("returned empty output");
  }, 15000);

  it("succeeds on command that echoes stdin", async () => {
    const provider = new CLIProvider("cat");
    const result = await provider.complete("hello from stdin");
    expect(result).toBe("hello from stdin");
  });

  it("prepends system prompt when provided", async () => {
    const provider = new CLIProvider("cat");
    const result = await provider.complete("user prompt", { system: "system prompt" });
    expect(result).toBe("system prompt\n\nuser prompt");
  });
});
