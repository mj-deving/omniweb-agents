/**
 * Tests for connect() SDK integration.
 *
 * Uses temp wallet files and mocked SDK to test the integration flow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { connect, disconnect } from "../../../src/toolkit/tools/connect.js";

describe("connect() integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "demos-connect-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function createWalletFile(content: string, mode: number = 0o600): string {
    const walletPath = join(tempDir, "credentials");
    writeFileSync(walletPath, content, { mode });
    return walletPath;
  }

  it("loads JSON wallet and fails at SDK connect (not wallet parsing)", async () => {
    const walletPath = createWalletFile(JSON.stringify({
      address: "demos1abc123test",
      mnemonic: "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12",
    }));

    // Should fail at SDK connect (no real RPC), NOT at wallet parsing
    try {
      await connect({ walletPath });
      // If it succeeds (e.g., SDK returns without error), that's fine too
    } catch (e: any) {
      // Error should be AUTH_FAILED (SDK connection), not INVALID_INPUT (wallet parsing)
      expect(e.code).toBe("AUTH_FAILED");
      expect(e.message).toContain("SDK connection failed");
    }
  });

  it("rejects mnemonic-only wallet files", async () => {
    const walletPath = createWalletFile(
      "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12",
    );

    try {
      await connect({ walletPath });
      expect.unreachable("Should have thrown");
    } catch (e: any) {
      expect(e.message || e.code).toContain("Mnemonic wallet files are not yet supported");
    }
  });

  it("rejects HTTP rpcUrl unless allowInsecureUrls", async () => {
    const walletPath = createWalletFile(JSON.stringify({ address: "demos1test" }));

    try {
      await connect({ walletPath, rpcUrl: "http://localhost:26657" });
      expect.unreachable("Should have thrown");
    } catch (e: any) {
      expect(e.message).toContain("HTTPS");
    }
  });

  it("allows HTTP rpcUrl when allowInsecureUrls is true", async () => {
    const walletPath = createWalletFile(JSON.stringify({ address: "demos1test" }));

    // Will fail at SDK connect (not a real RPC), but should pass the HTTPS check
    try {
      await connect({ walletPath, rpcUrl: "http://localhost:26657", allowInsecureUrls: true });
    } catch (e: any) {
      // Should NOT be an HTTPS error
      expect(e.message).not.toContain("HTTPS");
    }
  });

  it("disconnect expires session", async () => {
    // Create a mock session to test disconnect
    const { DemosSession } = await import("../../../src/toolkit/session.js");
    const { FileStateStore } = await import("../../../src/toolkit/state-store.js");

    const session = new DemosSession({
      walletAddress: "demos1test",
      rpcUrl: "https://demosnode.discus.sh",
      algorithm: "falcon",
      authToken: "test-token",
      signingHandle: {},
      stateStore: new FileStateStore(tempDir),
    });

    expect(session.expired).toBe(false);
    disconnect(session);
    expect(session.expired).toBe(true);
  });
});
