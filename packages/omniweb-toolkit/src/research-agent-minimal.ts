import { createClient } from "./index.js";
import { describeRuntimeCapabilities } from "./runtime.js";
import { buildLeaderboardPatternPrompt, getStarterSourcePack } from "./agent.js";

export interface RunResearchAgentMinimalOptions {
  cwd?: string;
  homeDir?: string;
  env?: Record<string, string | undefined>;
  skipLiveRead?: boolean;
  timeoutMs?: number;
}

export interface ResearchAgentMinimalSummary {
  imports: {
    main: string[];
    agent: string[];
  };
  dryRun: {
    action: "plan_only";
    spendsDem: false;
    sourceId: string;
    promptLength: number;
  };
  runtimeCapabilities: ReturnType<typeof describeRuntimeCapabilities>;
  sourcePack: {
    archetype: string;
    sourceCount: number;
  };
  liveRead: null | {
    feedCount: number;
    firstCategory: string | null;
  };
}

export async function runResearchAgentMinimal(
  options: RunResearchAgentMinimalOptions = {},
): Promise<ResearchAgentMinimalSummary> {
  const runtimeCapabilities = describeRuntimeCapabilities({
    cwd: options.cwd,
    homeDir: options.homeDir,
    env: options.env,
  });

  const sourcePack = getStarterSourcePack("research");
  if (!sourcePack?.entries?.length) {
    throw new Error("research starter source pack unavailable");
  }

  const firstSource = sourcePack.entries[0];
  const promptText = buildLeaderboardPatternPrompt({
    role: "a package-consumer smoke tester",
    sourceName: firstSource.label,
    sourceUrl: "https://example.test/source.json",
    observedFacts: [firstSource.why],
    objective: "Return a dry-run plan only. Do not publish or spend DEM.",
    domainRules: ["Do not publish.", "Do not spend DEM."],
    outputRules: ["Return one compact plan."],
  });

  let liveRead: ResearchAgentMinimalSummary["liveRead"] = null;
  if (!options.skipLiveRead) {
    const client = createClient({ timeoutMs: options.timeoutMs ?? 20_000 });
    const feed = await client.getFeed({ limit: 1 });
    liveRead = {
      feedCount: feed.posts?.length ?? 0,
      firstCategory: feed.posts?.[0]?.payload?.cat ?? null,
    };
  }

  return {
    imports: {
      main: ["createClient"],
      agent: ["buildLeaderboardPatternPrompt", "getStarterSourcePack"],
    },
    dryRun: {
      action: "plan_only",
      spendsDem: false,
      sourceId: firstSource.sourceId,
      promptLength: promptText.length,
    },
    runtimeCapabilities,
    sourcePack: {
      archetype: sourcePack.archetype,
      sourceCount: sourcePack.entries.length,
    },
    liveRead,
  };
}
