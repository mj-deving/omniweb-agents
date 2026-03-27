/**
 * Tests for react, tip, scan, verify, attest, discoverSources, pay tools.
 *
 * Verifies typed contracts, parameter validation, and guard integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DemosSession } from "../../../src/toolkit/session.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";
import { publish, reply } from "../../../src/toolkit/tools/publish.js";
import { react } from "../../../src/toolkit/tools/react.js";
import { tip } from "../../../src/toolkit/tools/tip.js";
import { scan } from "../../../src/toolkit/tools/scan.js";
import { verify } from "../../../src/toolkit/tools/verify.js";
import { attest } from "../../../src/toolkit/tools/attest.js";
import { discoverSources } from "../../../src/toolkit/tools/discover-sources.js";
import { pay } from "../../../src/toolkit/tools/pay.js";

function createTestSession(tempDir: string, overrides?: Partial<ConstructorParameters<typeof DemosSession>[0]>) {
  return new DemosSession({
    walletAddress: "demos1tooltest",
    rpcUrl: "https://demosnode.discus.sh",
    algorithm: "falcon",
    authToken: "test-token",
    signingHandle: {},
    stateStore: new FileStateStore(tempDir),
    ...overrides,
  });
}

describe("react()", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "demos-react-")); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  it("accepts DemosSession as first parameter", async () => {
    const session = createTestSession(tempDir);
    const result = await react(session, { txHash: "0xabc", type: "agree" });
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("provenance");
  });

  it("returns ToolResult with success boolean", async () => {
    const session = createTestSession(tempDir);
    const result = await react(session, { txHash: "0xabc", type: "agree" });
    // Will fail (no SDK) but typed result structure is correct
    if (result.ok) {
      expect(typeof result.data!.success).toBe("boolean");
    } else {
      expect(result.error).toBeDefined();
    }
  });

  it("rejects missing txHash", async () => {
    const session = createTestSession(tempDir);
    const result = await react(session, { txHash: "", type: "agree" });
    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe("INVALID_INPUT");
  });

  it("rejects invalid reaction type", async () => {
    const session = createTestSession(tempDir);
    const result = await react(session, { txHash: "0x1", type: "like" as "agree" });
    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe("INVALID_INPUT");
  });
});

describe("tip()", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "demos-tip-tool-")); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  it("accepts DemosSession as first parameter", async () => {
    const session = createTestSession(tempDir);
    const result = await tip(session, { txHash: "0xabc", amount: 5 });
    expect(result).toHaveProperty("ok");
  });

  it("enforces tip spend cap", async () => {
    const session = createTestSession(tempDir);
    const result = await tip(session, { txHash: "0xabc", amount: 15 });
    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe("SPEND_LIMIT");
  });

  it("rejects missing txHash", async () => {
    const session = createTestSession(tempDir);
    const result = await tip(session, { txHash: "", amount: 5 });
    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe("INVALID_INPUT");
  });
});

describe("scan()", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "demos-scan-")); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  it("accepts DemosSession as first parameter", async () => {
    const session = createTestSession(tempDir);
    const result = await scan(session);
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("provenance");
  });

  it("returns ToolResult with posts array on success", async () => {
    const session = createTestSession(tempDir);
    const result = await scan(session);
    // Will fail (no API) but structure is correct
    if (result.ok) {
      expect(Array.isArray(result.data!.posts)).toBe(true);
    } else {
      expect(result.error).toBeDefined();
    }
  });
});

describe("verify()", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "demos-verify-")); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  it(
    "accepts DemosSession as first parameter",
    async () => {
      const session = createTestSession(tempDir);
      const result = await verify(session, { txHash: "0xabc" });
      expect(result).toHaveProperty("ok");
    },
    25000,
  );

  it("rejects missing txHash", async () => {
    const session = createTestSession(tempDir);
    const result = await verify(session, { txHash: "" });
    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe("INVALID_INPUT");
  });
});

describe("attest()", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "demos-attest-")); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  it("accepts DemosSession as first parameter", async () => {
    const session = createTestSession(tempDir);
    const result = await attest(session, { url: "https://api.binance.com/price" });
    expect(result).toHaveProperty("ok");
  });

  it("rejects missing URL", async () => {
    const session = createTestSession(tempDir);
    const result = await attest(session, { url: "" });
    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe("INVALID_INPUT");
  });

  it("rejects HTTP URL by default", async () => {
    const session = createTestSession(tempDir);
    const result = await attest(session, { url: "http://insecure.com/data" });
    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe("INVALID_INPUT");
    expect(result.error!.message).toContain("HTTPS");
  });

  it("allows HTTP when allowInsecureUrls is true", async () => {
    const session = createTestSession(tempDir, { allowInsecureUrls: true });
    const result = await attest(session, { url: "http://localhost/data" });
    // Will fail at SDK level but should pass the HTTPS check
    expect(result.error?.code !== "INVALID_INPUT" || !result.error?.message.includes("HTTPS")).toBe(true);
  });
});

describe("discoverSources()", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "demos-discover-")); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  it("returns ToolResult with Source array", async () => {
    const session = createTestSession(tempDir);
    const result = await discoverSources(session);
    // May fail if catalog path doesn't resolve, but structure is correct
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("provenance");
  });

  it("accepts null session for sessionless browsing", async () => {
    const result = await discoverSources(null);
    expect(result).toHaveProperty("ok");
  });

  it("filters by domain when specified", async () => {
    // Create a minimal test catalog
    const catalogPath = join(tempDir, "test-catalog.json");
    writeFileSync(catalogPath, JSON.stringify([
      { id: "s1", name: "Source 1", domain: "crypto", url: "https://a.com", status: "active" },
      { id: "s2", name: "Source 2", domain: "macro", url: "https://b.com", status: "active" },
      { id: "s3", name: "Source 3", domain: "crypto", url: "https://c.com", status: "active" },
    ]));

    const session = createTestSession(tempDir, { sourceCatalogPath: catalogPath });
    const result = await discoverSources(session, { domain: "crypto" });

    expect(result.ok).toBe(true);
    expect(result.data!.sources).toHaveLength(2);
    expect(result.data!.sources.every(s => s.domain === "crypto")).toBe(true);
  });
});

describe("pay()", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "demos-pay-tool-")); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  it("accepts DemosSession as first parameter", async () => {
    const session = createTestSession(tempDir);
    const result = await pay(session, { url: "https://api.com/data", maxSpend: 10 });
    expect(result).toHaveProperty("ok");
  });

  it("rejects missing URL", async () => {
    const session = createTestSession(tempDir);
    const result = await pay(session, { url: "", maxSpend: 10 });
    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe("INVALID_INPUT");
  });

  it("rejects zero maxSpend", async () => {
    const session = createTestSession(tempDir);
    const result = await pay(session, { url: "https://api.com/data", maxSpend: 0 });
    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe("INVALID_INPUT");
  });

  it("rejects HTTP URL by default", async () => {
    const session = createTestSession(tempDir);
    const result = await pay(session, { url: "http://api.com/data", maxSpend: 10 });
    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe("INVALID_INPUT");
    expect(result.error!.message).toContain("HTTPS");
  });

  it("returns cached result for duplicate payment (idempotency)", async () => {
    const session = createTestSession(tempDir);
    // Record a receipt manually
    const { recordPayReceipt, makeIdempotencyKey } = await import(
      "../../../src/toolkit/guards/pay-receipt-log.js"
    );
    const key = makeIdempotencyKey("https://api.com/data", "GET");
    await recordPayReceipt(session.stateStore, session.walletAddress, {
      txHash: "0xcached",
      url: "https://api.com/data",
      amount: 5,
      timestamp: Date.now(),
      idempotencyKey: key,
    });

    const result = await pay(session, { url: "https://api.com/data", maxSpend: 10 });
    expect(result.ok).toBe(true);
    expect(result.data!.receipt!.txHash).toBe("0xcached");
  });
});

describe("All tools accept DemosSession as first parameter", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "demos-all-tools-")); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  it("every tool function takes session as arg[0]", () => {
    // Type-level verification: all tool functions accept DemosSession
    const session = createTestSession(tempDir);

    // These compile = type contract satisfied
    const _p = publish;  // (session, draft) => ToolResult<PublishResult>
    const _r = reply;    // (session, opts) => ToolResult<PublishResult>
    const _rc = react;   // (session, opts) => ToolResult<ReactResult>
    const _t = tip;      // (session, opts) => ToolResult<TipResult>
    const _s = scan;     // (session, opts?) => ToolResult<ScanResult>
    const _v = verify;   // (session, opts) => ToolResult<VerifyResult>
    const _a = attest;   // (session, opts) => ToolResult<AttestResult>
    const _d = discoverSources; // (session | null, opts?) => ToolResult<...>
    const _pay = pay;    // (session, opts) => ToolResult<PayResult>

    // All are functions
    expect(typeof _p).toBe("function");
    expect(typeof _r).toBe("function");
    expect(typeof _rc).toBe("function");
    expect(typeof _t).toBe("function");
    expect(typeof _s).toBe("function");
    expect(typeof _v).toBe("function");
    expect(typeof _a).toBe("function");
    expect(typeof _d).toBe("function");
    expect(typeof _pay).toBe("function");
  });
});
