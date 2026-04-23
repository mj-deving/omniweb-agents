import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchTextMock = vi.hoisted(() => vi.fn());

vi.mock("../../packages/omniweb-toolkit/scripts/_shared.js", async () => {
  const actual = await vi.importActual<typeof import("../../packages/omniweb-toolkit/scripts/_shared.js")>(
    "../../packages/omniweb-toolkit/scripts/_shared.js",
  );
  return {
    ...actual,
    fetchText: fetchTextMock,
  };
});

import {
  buildSourceHealthReport,
  checkSourceHealth,
  expandEnvPlaceholders,
  loadManifestEntries,
  resolveJsonPath,
  type HealthManifestEntry,
} from "../../packages/omniweb-toolkit/scripts/check-sources-health.ts";

describe("check-sources-health", () => {
  let tempDir: string;
  let originalFredApiKey: string | undefined;
  let originalBlsApiKey: string | undefined;

  beforeEach(() => {
    fetchTextMock.mockReset();
    tempDir = mkdtempSync(join(tmpdir(), "check-sources-health-"));
    originalFredApiKey = process.env.FRED_API_KEY;
    originalBlsApiKey = process.env.BLS_API_KEY;
    delete process.env.FRED_API_KEY;
    delete process.env.BLS_API_KEY;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    if (originalFredApiKey === undefined) {
      delete process.env.FRED_API_KEY;
    } else {
      process.env.FRED_API_KEY = originalFredApiKey;
    }
    if (originalBlsApiKey === undefined) {
      delete process.env.BLS_API_KEY;
    } else {
      process.env.BLS_API_KEY = originalBlsApiKey;
    }
  });

  it("loads canonical sources, session entries, and nested session files", () => {
    const nestedPath = join(tempDir, "session-02.json");
    writeFileSync(
      nestedPath,
      JSON.stringify({
        sessionFiles: ["session-03.json"],
        entries: [
          {
            id: "session-2-entry",
            sourceName: "kraken-btc-ticker",
            attestUrl: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
            jsonPath: "result.XXBTZUSD.c[0]",
          },
        ],
      }),
    );
    writeFileSync(
      join(tempDir, "session-03.json"),
      JSON.stringify({
        entries: [
          {
            id: "session-3-entry",
            sourceName: "coinbase-btc-spot-2",
            attestUrl: "https://api.coinbase.com/v2/prices/BTC-USD/spot",
            jsonPath: "data.amount",
          },
        ],
      }),
    );

    const rootPath = join(tempDir, "generalist-40.json");
    writeFileSync(
      rootPath,
      JSON.stringify({
        sources: [
          {
            sourceId: 5,
            sourceName: "fred-walcl-json",
            attestUrl: "https://api.stlouisfed.org/fred/series/observations?api_key=${FRED_API_KEY}",
            jsonPath: "observations[0].value",
            auth: "FRED_API_KEY",
            burst: "sequential",
          },
        ],
        entries: [
          {
            id: "verify-only-entry",
            sourceName: "coinbase-btc-spot",
            attestUrl: "https://api.coinbase.com/v2/prices/BTC-USD/spot",
            verifyJsonPath: "data.amount",
          },
        ],
        sessionFiles: ["session-02.json"],
      }),
    );

    const entries = loadManifestEntries(rootPath, { includeSessionFiles: true });

    expect(entries).toHaveLength(4);
    expect(entries.map((entry) => entry.id)).toEqual([
      "5",
      "verify-only-entry",
      "session-2-entry",
      "session-3-entry",
    ]);
    expect(entries[1].jsonPath).toBe("data.amount");
    expect(entries[2].manifestPath).toBe(nestedPath);
  });

  it("fails malformed manifest entries instead of silently skipping them", () => {
    const manifestPath = join(tempDir, "bad-manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        entries: [
          {
            id: "broken-entry",
            sourceName: "missing-json-path",
            attestUrl: "https://example.com/data.json",
          },
        ],
      }),
    );

    expect(() => loadManifestEntries(manifestPath)).toThrow(/Malformed manifest entry/);
  });

  it("expands env placeholders and reports missing keys", () => {
    const unresolved = expandEnvPlaceholders(
      "https://example.com/data?api_key=${FRED_API_KEY}&other=${BLS_API_KEY}",
    );
    expect(unresolved.resolvedUrl).toBeNull();
    expect(unresolved.placeholderKeys).toEqual(["FRED_API_KEY", "BLS_API_KEY"]);
    expect(unresolved.missingEnvKeys).toEqual(["FRED_API_KEY", "BLS_API_KEY"]);

    process.env.FRED_API_KEY = "fred-demo";
    const partiallyResolved = expandEnvPlaceholders(
      "https://example.com/data?api_key=${FRED_API_KEY}&other=${BLS_API_KEY}",
    );
    expect(partiallyResolved.resolvedUrl).toBeNull();
    expect(partiallyResolved.missingEnvKeys).toEqual(["BLS_API_KEY"]);
  });

  it("resolves sweep-style json paths with keys, indices, and wildcards", () => {
    const payload = {
      data: [{ current_price: 19.39 }],
      result: { XXBTZUSD: { c: ["77888.1", "1", "1.0"] } },
      peggedAssets: [
        { circulating: { peggedUSD: 188_680_000_000 } },
        { circulating: { peggedUSD: 100_000_000 } },
      ],
    };
    const rootArrayPayload = [
      { field: "alpha" },
      { field: "beta" },
    ];

    expect(resolveJsonPath(payload, "data[0].current_price")).toEqual([19.39]);
    expect(resolveJsonPath(payload, "result.XXBTZUSD.c[0]")).toEqual(["77888.1"]);
    expect(resolveJsonPath(payload, "peggedAssets[*].circulating.peggedUSD")).toEqual([
      188_680_000_000,
      100_000_000,
    ]);
    expect(resolveJsonPath(rootArrayPayload, "[*].field")).toEqual(["alpha", "beta"]);
    expect(resolveJsonPath(payload, "$.result.XXBTZUSD.c[0]")).toEqual(["77888.1"]);
  });

  it("reports healthy sources when the fetched JSON and jsonPath both resolve", async () => {
    fetchTextMock.mockResolvedValue({
      ok: true,
      status: 200,
      url: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
      body: JSON.stringify({
        result: {
          XXBTZUSD: {
            c: ["77888.1"],
          },
        },
      }),
    });

    const entry: HealthManifestEntry = {
      id: "kraken",
      sourceName: "kraken-btc-ticker",
      attestUrl: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
      jsonPath: "result.XXBTZUSD.c[0]",
      manifestPath: "/tmp/session-01.json",
    };

    const result = await checkSourceHealth(entry);

    expect(result.ok).toBe(true);
    expect(result.classification).toBe("healthy");
    expect(result.status).toBe(200);
    expect(result.jsonParseOk).toBe(true);
    expect(result.jsonPathResolved).toBe(true);
    expect(result.resolvedSamples).toEqual(["77888.1"]);
    expect(fetchTextMock).toHaveBeenCalledTimes(1);
    expect(fetchTextMock).toHaveBeenCalledWith(
      "/0/public/Ticker?pair=XBTUSD",
      expect.objectContaining({
        baseUrl: "https://api.kraken.com",
        accept: "application/json",
        token: "",
      }),
    );
  });

  it("marks missing env placeholders as failures in the report", async () => {
    const manifestPath = join(tempDir, "session-01.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        entries: [
          {
            id: "walcl",
            sourceName: "fred-walcl-json",
            attestUrl: "https://api.stlouisfed.org/fred/series/observations?api_key=${FRED_API_KEY}",
            jsonPath: "observations[0].value",
          },
        ],
      }),
    );

    const report = await buildSourceHealthReport(manifestPath);

    expect(report.ok).toBe(false);
    expect(report.failures).toBe(1);
    expect(report.results[0].error).toBe("missing_env:FRED_API_KEY");
    expect(report.results[0].classification).toBe("env_blocked");
    expect(report.classificationCounts.env_blocked).toBe(1);
    expect(fetchTextMock).not.toHaveBeenCalled();
  });

  it("treats malformed attest urls as per-entry failures", async () => {
    const entry: HealthManifestEntry = {
      id: "bad-url",
      sourceName: "broken-source",
      attestUrl: "not a valid url",
      jsonPath: "data.value",
      manifestPath: "/tmp/session-01.json",
    };

    const result = await checkSourceHealth(entry);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBeTruthy();
    expect(result.classification).toBe("broken_url");
    expect(fetchTextMock).not.toHaveBeenCalled();
  });

  it("classifies 404s, unresolved json paths, and timeouts distinctly", async () => {
    const http404Entry: HealthManifestEntry = {
      id: "dead-url",
      sourceName: "dead-url",
      attestUrl: "https://example.com/missing.json",
      jsonPath: "data.value",
      manifestPath: "/tmp/session-01.json",
    };
    fetchTextMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      url: "https://example.com/missing.json",
      body: "not found",
      error: "http_404",
    });

    const unresolvedPathEntry: HealthManifestEntry = {
      id: "unresolved-path",
      sourceName: "unresolved-path",
      attestUrl: "https://example.com/live.json",
      jsonPath: "data.value",
      manifestPath: "/tmp/session-01.json",
    };
    fetchTextMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      url: "https://example.com/live.json",
      body: JSON.stringify({ data: {} }),
    });

    const timeoutEntry: HealthManifestEntry = {
      id: "timeout-source",
      sourceName: "timeout-source",
      attestUrl: "https://example.com/slow.json",
      jsonPath: "data.value",
      manifestPath: "/tmp/session-01.json",
    };
    fetchTextMock.mockResolvedValueOnce({
      ok: false,
      status: 0,
      url: "https://example.com/slow.json",
      body: "",
      error: "The operation was aborted due to timeout",
    });

    const http404Result = await checkSourceHealth(http404Entry);
    const unresolvedPathResult = await checkSourceHealth(unresolvedPathEntry);
    const timeoutResult = await checkSourceHealth(timeoutEntry);

    expect(http404Result.classification).toBe("broken_url");
    expect(unresolvedPathResult.classification).toBe("broken_json_path");
    expect(timeoutResult.classification).toBe("timeout");
  });
});
