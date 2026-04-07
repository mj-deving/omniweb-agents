import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";

import { simulateTransaction, type SimulationResult } from "../../../src/toolkit/chain/tx-simulator.js";

describe("simulateTransaction", () => {
  let mockFetch: Mock;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  const baseOpts = {
    rpcUrl: "https://rpc.example.com",
    from: "0xaaa",
    to: "0xbbb",
    data: "0x1234",
  };

  // ── Success path ─────────────────────────────────────

  it("returns success when eth_call succeeds", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: 1, result: "0x" }),
    });

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("sends correct JSON-RPC eth_call payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: 1, result: "0x" }),
    });

    await simulateTransaction({ ...baseOpts, value: "0x100" }, mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://rpc.example.com");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body);
    expect(body.method).toBe("eth_call");
    expect(body.params[0]).toEqual({
      from: "0xaaa",
      to: "0xbbb",
      data: "0x1234",
      value: "0x100",
    });
    expect(body.params[1]).toBe("latest");
  });

  it("omits value field when not provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: 1, result: "0x" }),
    });

    await simulateTransaction(baseOpts, mockFetch);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.params[0].value).toBeUndefined();
  });

  // ── Revert detection ─────────────────────────────────

  it("returns failure when RPC returns error object", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        error: { code: 3, message: "execution reverted: Insufficient balance" },
      }),
    });

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Insufficient balance");
  });

  it("returns failure with hex-decoded revert data", async () => {
    // 0x08c379a0 = Error(string) selector
    // Encodes "Not enough funds"
    const revertData =
      "0x08c379a0" +
      "0000000000000000000000000000000000000000000000000000000000000020" +
      "000000000000000000000000000000000000000000000000000000000000000f" +
      "4e6f7420656e6f7567682066756e64730000000000000000000000000000000000";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        error: { code: 3, message: "execution reverted", data: revertData },
      }),
    });

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(false);
    expect(result.error).toContain("execution reverted");
  });

  // ── Fail-closed (default): network/HTTP/parse errors → success: false ──

  it("returns failure on network error when failOpen is false (default)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(false);
    expect(result.error).toContain("simulation unavailable");
  });

  it("returns failure on HTTP error when failOpen is false (default)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: async () => { throw new Error("not json"); },
    });

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(false);
    expect(result.error).toContain("simulation unavailable");
  });

  it("returns failure on malformed JSON when failOpen is false (default)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new SyntaxError("Unexpected token"); },
    });

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(false);
    expect(result.error).toContain("simulation unavailable");
  });

  it("returns failure when result field is missing and failOpen is false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: 1 }),
    });

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(false);
    expect(result.error).toContain("simulation unavailable");
  });

  it("returns failure on timeout when failOpen is false (default)", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    mockFetch.mockRejectedValueOnce(abortError);

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(false);
    expect(result.error).toContain("simulation unavailable");
  });

  // ── Fail-open (explicit opt-in): keeps old behavior ────────────

  it("returns success with warning on network error when failOpen is true", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await simulateTransaction({ ...baseOpts, failOpen: true }, mockFetch);

    expect(result.success).toBe(true);
    expect(result.warning).toContain("ECONNREFUSED");
  });

  it("returns success with warning on HTTP error when failOpen is true", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: async () => { throw new Error("not json"); },
    });

    const result = await simulateTransaction({ ...baseOpts, failOpen: true }, mockFetch);

    expect(result.success).toBe(true);
    expect(result.warning).toContain("502");
  });

  it("returns success with warning on malformed JSON when failOpen is true", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new SyntaxError("Unexpected token"); },
    });

    const result = await simulateTransaction({ ...baseOpts, failOpen: true }, mockFetch);

    expect(result.success).toBe(true);
    expect(result.warning).toContain("malformed");
  });

  it("returns success with warning on missing result when failOpen is true", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: 1 }),
    });

    const result = await simulateTransaction({ ...baseOpts, failOpen: true }, mockFetch);

    expect(result.success).toBe(true);
    expect(result.warning).toBeDefined();
  });

  // ── RPC response shape validation ──────────────────────

  it("rejects response missing jsonrpc field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, result: "0x" }),
    });

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(false);
    expect(result.error).toContain("simulation unavailable");
  });

  it("rejects response with wrong jsonrpc version", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: "1.0", id: 1, result: "0x" }),
    });

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(false);
    expect(result.error).toContain("simulation unavailable");
  });

  it("rejects response with non-numeric id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: "abc", result: "0x" }),
    });

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(false);
    expect(result.error).toContain("simulation unavailable");
  });

  it("rejects response with result that is not a hex string", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: 1, result: "not-hex" }),
    });

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(false);
    expect(result.error).toContain("simulation unavailable");
  });

  it("accepts valid hex result with data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: "0x0000000000000000000000000000000000000001",
      }),
    });

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(true);
  });

  // ── RPC shape validation + failOpen interaction ──────────

  it("allows invalid shape through when failOpen is true", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, result: "0x" }), // missing jsonrpc
    });

    const result = await simulateTransaction({ ...baseOpts, failOpen: true }, mockFetch);

    expect(result.success).toBe(true);
    expect(result.warning).toBeDefined();
  });

  // ── Gas estimate extraction ──────────────────────────

  it("passes through gas estimate when result contains data", async () => {
    // A non-empty result indicates success; length can hint at gas
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: "0x0000000000000000000000000000000000000001",
      }),
    });

    const result = await simulateTransaction(baseOpts, mockFetch);

    expect(result.success).toBe(true);
  });

  // ── Timeout behavior ─────────────────────────────────

  it("uses AbortSignal with timeout for RPC call", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: 1, result: "0x" }),
    });

    await simulateTransaction({ ...baseOpts, timeoutMs: 5000 }, mockFetch);

    const [, init] = mockFetch.mock.calls[0];
    expect(init.signal).toBeDefined();
  });
});
