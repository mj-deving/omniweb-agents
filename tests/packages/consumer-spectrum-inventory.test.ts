import { describe, expect, it } from "vitest";
import {
  buildConsumerSpectrumInventoryReport,
  buildOfficialSkillCoverageReport,
  buildToolkitCapabilityManifest,
  classifyConsumerSpectrumProbe,
  CONSUMER_SPECTRUM_CLASSIFICATIONS,
  CONSUMER_SPECTRUM_DISCOVERY_RESOURCES,
  CONSUMER_SPECTRUM_ENDPOINT_PROBES,
  extractOpenApiPaths,
  getOfficialSkillSurfaceAreas,
  summarizeConsumerSpectrumBodyShape,
  type ConsumerSpectrumLiveProbeResult,
} from "../../packages/omniweb-toolkit/src/agent.js";
import { describeRuntimeCapabilities, type RuntimeCapabilityResult } from "../../packages/omniweb-toolkit/src/readiness.js";

describe("consumer spectrum inventory", () => {
  it("builds the no-spend inventory contract across official, live, and local surfaces", () => {
    const manifest = buildToolkitCapabilityManifest({
      now: new Date("2026-05-18T17:40:00.000Z"),
      runtimeCapabilities: readyRuntime(),
    });
    const officialCoverage = buildOfficialSkillCoverageReport(manifest, {
      now: new Date("2026-05-18T17:41:00.000Z"),
    });
    const openapiPaths = extractOpenApiPaths({
      paths: {
        "/api/feed": {},
        "/api/feed/search": {},
        "/api/signals": {},
        "/api/webhooks": {},
      },
    });
    const liveProbeResults: ConsumerSpectrumLiveProbeResult[] = [
      ...CONSUMER_SPECTRUM_DISCOVERY_RESOURCES.map((resource) => ({
        id: resource.id,
        path: resource.path,
        method: "GET",
        expected: resource.expected,
        actual: resource.expected === "not_found" ? "not_found" as const : "ok" as const,
        httpStatus: resource.expected === "not_found" ? 404 : 200,
        contentType: resource.path.endsWith(".json") ? "application/json" : "text/plain",
        classification: classifyConsumerSpectrumProbe({
          probe: resource,
          httpStatus: resource.expected === "not_found" ? 404 : 200,
        }),
        advertisedBy: resource.advertisedBy,
        shape: summarizeConsumerSpectrumBodyShape(resource.path.endsWith(".json") ? "{}" : "ok"),
        notes: resource.notes,
      })),
      ...CONSUMER_SPECTRUM_ENDPOINT_PROBES.map((probe) => ({
        id: probe.id,
        path: probe.path,
        method: probe.method,
        expected: probe.expected,
        actual: probe.expected === "external_or_mutating" || probe.expected === "streaming"
          ? "not_fetched" as const
          : probe.expected === "auth_required" ? "auth_required" as const : "ok" as const,
        httpStatus: probe.expected === "external_or_mutating" || probe.expected === "streaming"
          ? 0
          : probe.expected === "auth_required" ? 401 : 200,
        contentType: "application/json",
        classification: probe.expected === "external_or_mutating" || probe.expected === "streaming"
          ? "blocked_external_or_mutating" as const
          : classifyConsumerSpectrumProbe({
            probe,
            httpStatus: probe.expected === "auth_required" ? 401 : 200,
            openapiPaths,
          }),
        advertisedBy: probe.advertisedBy,
        shape: summarizeConsumerSpectrumBodyShape("{}"),
        notes: probe.notes,
      })),
    ];

    const report = buildConsumerSpectrumInventoryReport({
      manifest,
      officialCoverage,
      officialAreas: getOfficialSkillSurfaceAreas(),
      liveProbeResults,
      openapiPaths,
      now: new Date("2026-05-18T17:42:00.000Z"),
      packageSurfaces: [".", "./agent", "./runtime", "./write", "./types"],
      existingChecks: ["check:consumer-spectrum-inventory", "check:live:detailed"],
    });

    expect(report.generatedAt).toBe("2026-05-18T17:42:00.000Z");
    expect(report.source).toMatchObject({
      package: "omniweb-toolkit",
      noSpend: true,
      noRelease: true,
    });
    expect(report.classificationVocabulary).toEqual(CONSUMER_SPECTRUM_CLASSIFICATIONS);
    expect(report.summary.ok).toBe(true);
    expect(report.summary.advertisedBut404).toEqual(expect.arrayContaining([
      "/.well-known/mcp.json",
      "/api/mcp/tools",
      "/api/capabilities",
    ]));
    expect(report.summary.advertisedButMissingLocally).not.toContain("chat");
    expect(report.summary.partialAreas).toEqual(expect.arrayContaining([
      "chat",
      "rss",
      "sse-stream",
      "binary-commodity-sports-markets",
      "eth-betting",
    ]));
    expect(report.summary.nextBeads).toEqual(expect.arrayContaining([
      "omniweb-agents-spectrum.2",
      "omniweb-agents-spectrum.10",
    ]));
    expect(report.localToolkit.capabilityCount).toBeGreaterThan(20);
    expect(report.localToolkit.packageSurfaces).toContain("./runtime");
  });

  it("summarizes response shapes without flattening live payload depth", () => {
    expect(summarizeConsumerSpectrumBodyShape(JSON.stringify({
      posts: [
        {
          txHash: "abc",
          payload: { text: "hello" },
        },
      ],
      hasMore: false,
    }))).toMatchObject({
      topLevelType: "object",
      topLevelKeys: ["hasMore", "posts"],
      sampleItemKeys: ["payload", "txHash"],
      parseStatus: "json",
    });

    expect(summarizeConsumerSpectrumBodyShape("<feed />")).toMatchObject({
      topLevelType: "string",
      parseStatus: "text",
    });
  });
});

function readyRuntime(): RuntimeCapabilityResult {
  const runtime = describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} });
  return {
    ...runtime,
    authReady: true,
    writeReady: true,
    recommendedMode: "write-ready",
    blockers: [],
    readiness: {
      ...runtime.readiness,
      ok: true,
      canAuth: true,
      canWrite: true,
      authState: "ready",
      writeState: "ready",
      missingEnv: [],
      missingPackages: [],
    },
    actionFamilies: {
      publish: { ...runtime.actionFamilies.publish, readiness: "ready" },
      reply: { ...runtime.actionFamilies.reply, readiness: "ready" },
      react: { ...runtime.actionFamilies.react, readiness: "ready" },
      tip: { ...runtime.actionFamilies.tip, readiness: "ready" },
      bet: { ...runtime.actionFamilies.bet, readiness: "ready" },
    },
  };
}
