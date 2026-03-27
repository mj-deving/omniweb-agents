/**
 * Tests for withToolWrapper — error handling behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DemosSession } from "../../../src/toolkit/session.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";
import { withToolWrapper, localProvenance } from "../../../src/toolkit/tools/tool-wrapper.js";
import { demosError, ok } from "../../../src/toolkit/types.js";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function createSession(tempDir: string) {
  return new DemosSession({
    walletAddress: "demos1wraptest",
    rpcUrl: "https://demosnode.discus.sh",
    algorithm: "falcon",
    authToken: "test-token",
    signingHandle: {},
    stateStore: new FileStateStore(tempDir),
  });
}

describe("withToolWrapper", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "demos-wrap-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("preserves DemosError code when thrown inside callback", async () => {
    const session = createSession(tempDir);
    const result = await withToolWrapper(session, "test", "TX_FAILED", async () => {
      throw demosError("INVALID_INPUT", "URL blocked: private IP", false);
    });

    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe("INVALID_INPUT");
    expect(result.error!.message).toContain("URL blocked");
    expect(result.error!.retryable).toBe(false);
  });

  it("wraps non-DemosError with default error code", async () => {
    const session = createSession(tempDir);
    const result = await withToolWrapper(session, "test", "TX_FAILED", async () => {
      throw new Error("something broke");
    });

    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe("TX_FAILED");
    expect(result.error!.message).toContain("something broke");
    expect(result.error!.retryable).toBe(true);
  });

  it("returns fn result on success", async () => {
    const session = createSession(tempDir);
    const result = await withToolWrapper(session, "test", "TX_FAILED", async (start) => {
      return ok({ value: 42 }, localProvenance(start));
    });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ value: 42 });
  });
});
