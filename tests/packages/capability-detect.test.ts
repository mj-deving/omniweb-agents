import { describe, expect, it } from "vitest";
import {
  fallbackColonyUrl,
  resolveStarterMode,
  summarizeCapabilities,
} from "../../packages/omniweb-toolkit/agents/openclaw/research-agent/skills/omniweb-research-agent/runtime/capability-detect.mjs";

describe("research-agent capability detection helpers", () => {
  it("degrades explicit dry-run to bundle mode when runtime deps are missing", () => {
    const mode = resolveStarterMode("dry-run", {
      ready: {
        bundle: true,
        dryRun: false,
        liveRead: false,
        liveWrite: false,
      },
    });

    expect(mode).toBe("bundle");
  });

  it("keeps explicit dry-run when runtime deps are ready", () => {
    const mode = resolveStarterMode("dry-run", {
      ready: {
        bundle: true,
        dryRun: true,
        liveRead: true,
        liveWrite: false,
      },
    });

    expect(mode).toBe("dry-run");
  });

  it("prefers shared COLONY_URL fallback before the OmniWeb-only override", () => {
    const previousColonyUrl = process.env.COLONY_URL;
    const previousOmniwebColonyUrl = process.env.OMNIWEB_COLONY_URL;

    process.env.COLONY_URL = "https://shared.example";
    process.env.OMNIWEB_COLONY_URL = "https://omniweb.example";

    try {
      expect(fallbackColonyUrl()).toBe("https://shared.example");
    } finally {
      if (previousColonyUrl === undefined) delete process.env.COLONY_URL;
      else process.env.COLONY_URL = previousColonyUrl;

      if (previousOmniwebColonyUrl === undefined) delete process.env.OMNIWEB_COLONY_URL;
      else process.env.OMNIWEB_COLONY_URL = previousOmniwebColonyUrl;
    }
  });

  it("summarizes auth and write capability states explicitly", () => {
    const summary = summarizeCapabilities({
      toolkitCore: true,
      toolkitRuntime: true,
      toolkitAgent: true,
      env: { DEMOS_MNEMONIC: false, RPC_URL: true, SUPERCOLONY_API: true },
      runtimeCapabilities: {
        recommendedMode: "read-only",
        blockers: ["missing_credentials"],
      },
      writeReadiness: {
        authState: "missing_credentials",
        writeState: "missing_credentials",
      },
      ready: {
        bundle: true,
        dryRun: true,
        liveRead: true,
        liveWrite: false,
      },
    });

    expect(summary).toContain("mode=read-only, blockers=missing_credentials");
  });
});
