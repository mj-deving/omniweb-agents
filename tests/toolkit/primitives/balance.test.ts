import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockApiClient, mockOk, mockErr } from "./_helpers.js";
import { createBalancePrimitives } from "../../../src/toolkit/primitives/balance.js";

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

describe("balance.requestFaucet", () => {
  it("returns success with amount on 200 response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, amount: 1000 }),
    });
    const bal = createBalancePrimitives({
      apiClient: createMockApiClient(),
      fetch: mockFetch,
    });

    const result = await bal.requestFaucet("0xchainaddr");

    expect(result).toEqual({ ok: true, data: { success: true, amount: 1000 } });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://faucetbackend.demos.sh/api/request",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: "0xchainaddr" }),
      }),
    );
  });

  it("returns error on rate limit (429)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("Rate limit exceeded — try again in ~1hr"),
    });
    const bal = createBalancePrimitives({
      apiClient: createMockApiClient(),
      fetch: mockFetch,
    });

    const result = await bal.requestFaucet("0xchainaddr");

    expect(result).toEqual({
      ok: false,
      status: 429,
      error: "Rate limit exceeded — try again in ~1hr",
    });
  });

  it("returns error on network failure", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("fetch failed"));
    const bal = createBalancePrimitives({
      apiClient: createMockApiClient(),
      fetch: mockFetch,
    });

    const result = await bal.requestFaucet("0xchainaddr");

    expect(result).toEqual({
      ok: false,
      status: 0,
      error: "Faucet request failed: fetch failed",
    });
  });

  it("uses custom faucetUrl when provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, amount: 500 }),
    });
    const bal = createBalancePrimitives({
      apiClient: createMockApiClient(),
      fetch: mockFetch,
      faucetUrl: "https://custom-faucet.example/api/request",
    });

    await bal.requestFaucet("0xchainaddr");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://custom-faucet.example/api/request",
      expect.any(Object),
    );
  });

  it("uses chain address in request body, not wallet address", async () => {
    const chainAddress = "0xCHAIN_SIGNING_KEY_abc123";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, amount: 1000 }),
    });
    const bal = createBalancePrimitives({
      apiClient: createMockApiClient(),
      fetch: mockFetch,
    });

    await bal.requestFaucet(chainAddress);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody).toEqual({ address: chainAddress });
    // Verify the raw address string is passed through — no transformation
    expect(callBody.address).toBe(chainAddress);
  });
});

describe("balance.ensureMinimum", () => {
  it("skips faucet when balance is above threshold", async () => {
    const client = createMockApiClient({
      getAgentBalance: vi.fn().mockResolvedValue(mockOk({ balance: 500, updatedAt: Date.now() })),
    });
    const mockFetch = vi.fn();
    const bal = createBalancePrimitives({ apiClient: client, fetch: mockFetch });

    const result = await bal.ensureMinimum("0xchain", 100);

    expect(result).toEqual({ ok: true, data: { topped: false, balance: 500n } });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips faucet when balance equals threshold", async () => {
    const client = createMockApiClient({
      getAgentBalance: vi.fn().mockResolvedValue(mockOk({ balance: 100, updatedAt: Date.now() })),
    });
    const mockFetch = vi.fn();
    const bal = createBalancePrimitives({ apiClient: client, fetch: mockFetch });

    const result = await bal.ensureMinimum("0xchain", 100);

    expect(result).toEqual({ ok: true, data: { topped: false, balance: 100n } });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls faucet when balance is below threshold", async () => {
    const client = createMockApiClient({
      getAgentBalance: vi.fn()
        .mockResolvedValueOnce(mockOk({ balance: 10, updatedAt: Date.now() }))
        .mockResolvedValueOnce(mockOk({ balance: 1010, updatedAt: Date.now() })),
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, amount: 1000 }),
    });
    const bal = createBalancePrimitives({ apiClient: client, fetch: mockFetch });

    const result = await bal.ensureMinimum("0xchain", 100);

    expect(result).toEqual({ ok: true, data: { topped: true, balance: 1010n } });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // Second getAgentBalance call fetches updated balance
    expect(client.getAgentBalance).toHaveBeenCalledTimes(2);
  });

  it("returns error when initial balance check fails", async () => {
    const client = createMockApiClient({
      getAgentBalance: vi.fn().mockResolvedValue(null),
    });
    const bal = createBalancePrimitives({ apiClient: client, fetch: vi.fn() });

    const result = await bal.ensureMinimum("0xchain", 100);

    expect(result).toEqual({ ok: false, status: 0, error: "Failed to check balance" });
  });

  it("returns error when faucet request fails", async () => {
    const client = createMockApiClient({
      getAgentBalance: vi.fn().mockResolvedValue(mockOk({ balance: 10, updatedAt: Date.now() })),
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("Rate limited"),
    });
    const bal = createBalancePrimitives({ apiClient: client, fetch: mockFetch });

    const result = await bal.ensureMinimum("0xchain", 100);

    expect(result).toEqual({ ok: false, status: 429, error: "Rate limited" });
  });
});
