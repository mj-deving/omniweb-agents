import { describe, it, expect, beforeEach } from "vitest";
import { testNapiCapability, isXmcoreAvailable, resetNapiCache } from "../../../src/toolkit/chain/napi-guard.js";

describe("napi-guard", () => {
  beforeEach(() => {
    resetNapiCache();
  });

  it("isXmcoreAvailable returns false before testing", () => {
    expect(isXmcoreAvailable()).toBe(false);
  });

  it("testNapiCapability returns a result with testedAt timestamp", async () => {
    const result = await testNapiCapability();
    expect(result.testedAt).toBeTruthy();
    expect(typeof result.available).toBe("boolean");
  });

  it("caches the result across calls", async () => {
    const first = await testNapiCapability();
    const second = await testNapiCapability();
    expect(first.testedAt).toBe(second.testedAt);
  });

  it("resetNapiCache clears the cache", async () => {
    await testNapiCapability();
    expect(isXmcoreAvailable()).toBeDefined();
    resetNapiCache();
    // After reset, isXmcoreAvailable returns false (no cached result)
    expect(isXmcoreAvailable()).toBe(false);
  });

  // Note: We can't easily test the "available: true" case in unit tests
  // because xmcore may or may not be available in the test environment.
  // The guard gracefully handles both cases.
  it("handles xmcore import failure gracefully", async () => {
    // In test environment, xmcore may or may not be available.
    // Either way, the guard should not crash.
    const result = await testNapiCapability();
    if (!result.available) {
      expect(result.error).toBeTruthy();
    }
  });
});
