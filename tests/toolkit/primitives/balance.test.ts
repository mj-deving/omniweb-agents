import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockApiClient, mockOk } from "./_helpers.js";
import { createBalancePrimitives, validateAddress, validateThreshold, FAUCET_COOLDOWN_MS } from "../../../src/toolkit/primitives/balance.js";

describe("balance.get", () => {
  it("delegates to apiClient.getAgentBalance", async () => {
    const data = { balance: 42.5, updatedAt: 1700000000000 };
    const client = createMockApiClient({ getAgentBalance: vi.fn().mockResolvedValue(mockOk(data)) });
    const bal = createBalancePrimitives({ apiClient: client });
    const result = await bal.get("0xa1");

    expect(result).toEqual(mockOk(data));
    expect(client.getAgentBalance).toHaveBeenCalledWith("0xa1");
  });

  it("returns null when API unreachable", async () => {
    const bal = createBalancePrimitives({ apiClient: createMockApiClient() });
    expect(await bal.get("0xa1")).toBeNull();
  });
});

// ── M2: Address & Threshold Validation ────────────

describe("validateAddress", () => {
  it("accepts valid 0x-prefixed hex address (40 hex chars)", () => {
    expect(validateAddress("0x" + "a".repeat(40))).toBe(true);
  });

  it("accepts longer hex addresses (42+ hex chars)", () => {
    expect(validateAddress("0x" + "b".repeat(64))).toBe(true);
  });

  it("rejects missing 0x prefix", () => {
    expect(validateAddress("a".repeat(40))).toBe(false);
  });

  it("rejects too-short address", () => {
    expect(validateAddress("0x" + "a".repeat(10))).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(validateAddress("0x" + "g".repeat(40))).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateAddress("")).toBe(false);
  });
});

describe("validateThreshold", () => {
  it("accepts positive numbers", () => {
    expect(validateThreshold(100n)).toBe(true);
    expect(validateThreshold(1n)).toBe(true);
  });

  it("rejects zero", () => {
    expect(validateThreshold(0n)).toBe(false);
  });

  it("rejects negative", () => {
    expect(validateThreshold(-1n)).toBe(false);
  });
});

// ── M2: Faucet Request Validation ────────────────

describe("balance.requestFaucet", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  it("returns success when faucet responds with { success: true }", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const bal = createBalancePrimitives({ apiClient: createMockApiClient() });
    const result = await bal.requestFaucet("0x" + "a".repeat(40));

    expect(result).toEqual({ ok: true });
  });

  it("rejects invalid address format", async () => {
    const bal = createBalancePrimitives({ apiClient: createMockApiClient() });
    const result = await bal.requestFaucet("bad-address");

    expect(result).toEqual({ ok: false, error: expect.stringContaining("address") });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns error when faucet responds with { success: false }", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false }),
    });

    const bal = createBalancePrimitives({ apiClient: createMockApiClient() });
    const result = await bal.requestFaucet("0x" + "a".repeat(40));

    expect(result).toEqual({ ok: false, error: expect.stringContaining("success") });
  });

  it("returns error when faucet response lacks explicit success: true", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    });

    const bal = createBalancePrimitives({ apiClient: createMockApiClient() });
    const result = await bal.requestFaucet("0x" + "a".repeat(40));

    expect(result).toEqual({ ok: false, error: expect.stringContaining("success") });
  });

  it("enforces cooldown between rapid calls", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const bal = createBalancePrimitives({ apiClient: createMockApiClient() });
    const first = await bal.requestFaucet("0x" + "a".repeat(40));
    expect(first.ok).toBe(true);

    const second = await bal.requestFaucet("0x" + "a".repeat(40));
    expect(second).toEqual({ ok: false, error: expect.stringContaining("cooldown") });
  });

  it("returns error on network failure", async () => {
    fetchSpy.mockRejectedValue(new Error("network down"));

    const bal = createBalancePrimitives({ apiClient: createMockApiClient() });
    const result = await bal.requestFaucet("0x" + "a".repeat(40));

    expect(result).toEqual({ ok: false, error: expect.stringContaining("network") });
  });
});

// ── M2: ensureMinimum ────────────────────────────

describe("balance.ensureMinimum", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  it("returns ok when balance is already sufficient", async () => {
    const client = createMockApiClient({
      getAgentBalance: vi.fn().mockResolvedValue(mockOk({ balance: 500, updatedAt: Date.now() })),
    });
    const bal = createBalancePrimitives({ apiClient: client });
    const result = await bal.ensureMinimum("0x" + "a".repeat(40), 100n);

    expect(result).toEqual({ ok: true, topped: false, balance: 500n });
  });

  it("rejects invalid address", async () => {
    const bal = createBalancePrimitives({ apiClient: createMockApiClient() });
    const result = await bal.ensureMinimum("bad", 100n);

    expect(result).toEqual({ ok: false, error: expect.stringContaining("address") });
  });

  it("rejects zero threshold", async () => {
    const bal = createBalancePrimitives({ apiClient: createMockApiClient() });
    const result = await bal.ensureMinimum("0x" + "a".repeat(40), 0n);

    expect(result).toEqual({ ok: false, error: expect.stringContaining("threshold") });
  });

  it("returns ok: false when post-faucet balance check fails", async () => {
    const client = createMockApiClient({
      getAgentBalance: vi.fn()
        .mockResolvedValueOnce(mockOk({ balance: 0, updatedAt: Date.now() })) // initial check
        .mockResolvedValueOnce(null), // post-faucet check fails
    });

    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const bal = createBalancePrimitives({ apiClient: client });
    const result = await bal.ensureMinimum("0x" + "a".repeat(40), 100n);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/verify|balance/i);
  });

  it("returns topped: true with verified balance after successful faucet", async () => {
    const client = createMockApiClient({
      getAgentBalance: vi.fn()
        .mockResolvedValueOnce(mockOk({ balance: 10, updatedAt: Date.now() })) // initial
        .mockResolvedValueOnce(mockOk({ balance: 1010, updatedAt: Date.now() })), // post-faucet
    });

    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const bal = createBalancePrimitives({ apiClient: client });
    const result = await bal.ensureMinimum("0x" + "a".repeat(40), 100n);

    expect(result).toEqual({ ok: true, topped: true, balance: 1010n });
  });
});
