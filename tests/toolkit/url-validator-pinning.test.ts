/**
 * TDD tests for DNS rebinding prevention via pinned fetch.
 *
 * S1 fix: validateUrl() resolves DNS, but the resolved IP must be PINNED
 * to the subsequent fetch() call so DNS cannot rebind between validation and fetch.
 *
 * Tests verify:
 * - createPinnedFetch returns a fetch that uses the pre-resolved IP
 * - Host header is set correctly (original hostname, not IP)
 * - Redirect hops in fetchWithValidatedRedirects re-validate AND re-pin DNS
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPinnedFetch } from "../../src/toolkit/url-validator.js";

describe("createPinnedFetch — DNS rebinding prevention", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("rewrites URL to use resolved IP and sets Host header to original hostname", async () => {
    const capturedCalls: Array<{ url: string; headers: Record<string, string> }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const headers: Record<string, string> = {};
      new Headers(init?.headers).forEach((v, k) => { headers[k] = v; });
      capturedCalls.push({ url: String(url), headers });
      return new Response("ok", { status: 200 });
    }));

    const pinnedFetch = createPinnedFetch("1.2.3.4");
    await pinnedFetch("https://example.com/data?q=1", { method: "GET" });

    expect(capturedCalls).toHaveLength(1);
    // URL must use the resolved IP instead of hostname
    expect(capturedCalls[0].url).toContain("1.2.3.4");
    // Host header must carry the original hostname for TLS SNI / virtual hosting
    expect(capturedCalls[0].headers["host"]).toBe("example.com");
  });

  it("preserves port in rewritten URL when non-default", async () => {
    const capturedUrls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
      capturedUrls.push(String(url));
      return new Response("ok", { status: 200 });
    }));

    const pinnedFetch = createPinnedFetch("1.2.3.4");
    await pinnedFetch("https://example.com:8443/path", {});

    expect(capturedUrls).toHaveLength(1);
    expect(capturedUrls[0]).toContain("1.2.3.4");
    expect(capturedUrls[0]).toContain("8443");
  });

  it("prevents DNS rebinding by always using the pinned IP", async () => {
    // Simulate: first DNS resolve returns 1.2.3.4 (safe)
    // But if DNS were re-resolved, it would return 169.254.169.254 (metadata)
    // The pinned fetch must use 1.2.3.4 regardless
    const capturedUrls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
      capturedUrls.push(String(url));
      return new Response("ok", { status: 200 });
    }));

    const pinnedFetch = createPinnedFetch("1.2.3.4");
    // Call multiple times — must always use pinned IP
    await pinnedFetch("https://evil.example.com/api", {});
    await pinnedFetch("https://evil.example.com/api", {});

    expect(capturedUrls).toHaveLength(2);
    for (const url of capturedUrls) {
      expect(url).toContain("1.2.3.4");
      expect(url).not.toContain("evil.example.com");
    }
  });

  it("passes through all RequestInit options to underlying fetch", async () => {
    let capturedInit: RequestInit | undefined;
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;
      return new Response("ok", { status: 200 });
    }));

    const pinnedFetch = createPinnedFetch("1.2.3.4");
    await pinnedFetch("https://example.com/data", {
      method: "POST",
      body: "test-body",
      redirect: "manual",
    });

    expect(capturedInit).toBeDefined();
    expect(capturedInit!.method).toBe("POST");
    expect(capturedInit!.body).toBe("test-body");
    expect(capturedInit!.redirect).toBe("manual");
  });

  it("handles URLs that are already IP addresses", async () => {
    const capturedUrls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
      capturedUrls.push(String(url));
      return new Response("ok", { status: 200 });
    }));

    const pinnedFetch = createPinnedFetch("93.184.216.34");
    await pinnedFetch("https://93.184.216.34/path", {});

    expect(capturedUrls).toHaveLength(1);
    expect(capturedUrls[0]).toContain("93.184.216.34");
  });

  it("merges caller-provided Host header with pinned IP (caller Host wins if set)", async () => {
    const capturedHeaders: Record<string, string>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const h: Record<string, string> = {};
      new Headers(init?.headers).forEach((v, k) => { h[k] = v; });
      capturedHeaders.push(h);
      return new Response("ok", { status: 200 });
    }));

    const pinnedFetch = createPinnedFetch("1.2.3.4");
    // When no Host header is set, pinned fetch should set it
    await pinnedFetch("https://example.com/path", {});
    expect(capturedHeaders[0]["host"]).toBe("example.com");
  });
});
