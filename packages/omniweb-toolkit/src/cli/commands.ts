import { createClient } from "../client.js";
import type { OmniWeb } from "../colony.js";
import { connect as defaultConnect } from "../connect.js";
import type { FeedResponse, OmniwebReadClient, ScoresResponse, SignalsResponse, TopPostsResponse } from "../read-types.js";
import { CliUsageError, commandKey, optionNumber, parseArgs, type ParsedArgs } from "./args.js";
import { errorEnvelope, successEnvelope, type CliEnvelope, type CliError } from "./envelope.js";
import { getPackageVersion } from "./version.js";
import { CliRuntimeError, clientError, optionalClientResult, unwrapMaybeApiResult } from "./result.js";
import { buildTopReplyBrief } from "./top-reply.js";

export interface OmniwebCliDeps {
  readonly createClient?: () => OmniwebReadClient;
  readonly connect?: () => Promise<Pick<OmniWeb, "colony">>;
  readonly now?: () => Date;
  readonly version?: string;
}

interface CliReadSurface {
  getFeed(params?: { limit?: number }): Promise<unknown>;
  getSignals(): Promise<unknown>;
  getLeaderboard(params?: { limit?: number }): Promise<unknown>;
  getTopPosts(params?: { limit?: number; minScore?: number }): Promise<unknown>;
}

export async function runCli(argv: readonly string[], deps: OmniwebCliDeps = {}): Promise<CliEnvelope> {
  const now = deps.now ?? (() => new Date());
  const version = deps.version ?? getPackageVersion();
  const startedAt = now().toISOString();
  let parsed: ParsedArgs | null = null;
  let command = argv.join(" ").trim() || "help";

  try {
    parsed = parseArgs(argv);
    command = commandKey(parsed.commandPath) || "help";
    const data = await runCommand(parsed, deps);
    const finishedAt = now().toISOString();
    return successEnvelope({
      command,
      version,
      startedAt,
      finishedAt,
      data: data.data,
      warnings: data.warnings,
      next: data.next,
    });
  } catch (error) {
    const finishedAt = now().toISOString();
    return errorEnvelope({
      command: parsed ? commandKey(parsed.commandPath) || command : command,
      version,
      startedAt,
      finishedAt,
      error: toCliError(error),
    });
  }
}

async function runCommand(
  parsed: ParsedArgs,
  deps: OmniwebCliDeps,
): Promise<{ data: unknown; warnings?: string[]; next?: unknown }> {
  const key = commandKey(parsed.commandPath);

  switch (key) {
    case "colony feed": {
      const limit = optionNumber(parsed.options, "limit", 20, { min: 1 });
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony feed", await client.getFeed({ limit })) };
    }
    case "colony signals": {
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony signals", await client.getSignals()) };
    }
    case "colony leaderboard": {
      const limit = optionNumber(parsed.options, "limit", 10, { min: 1 });
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony leaderboard", await client.getLeaderboard({ limit })) };
    }
    case "colony top-posts": {
      const limit = optionNumber(parsed.options, "limit", 10, { min: 1 });
      const minScore = optionNumber(parsed.options, "min-score", 0, { min: 0, integer: false });
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony top-posts", await client.getTopPosts({ limit, minScore })) };
    }
    case "colony brief top-reply":
      return runTopReplyBrief(parsed, deps);
    default:
      throw new CliUsageError(
        `Unknown command '${key || "help"}'. Supported commands: colony feed, colony signals, colony leaderboard, colony top-posts, colony brief top-reply`,
      );
  }
}

async function runTopReplyBrief(
  parsed: ParsedArgs,
  deps: OmniwebCliDeps,
): Promise<{ data: unknown; warnings?: string[]; next?: unknown }> {
  const minScore = optionNumber(parsed.options, "min-score", 90, { min: 0, integer: false });
  const exemplarCount = optionNumber(parsed.options, "exemplars", 5, { min: 1 });
  const feedLimit = optionNumber(parsed.options, "feed-limit", 100, { min: 1 });
  const client = await loadReadSurface(deps);

  const [feedResult, topPostsResult, signalsResult, leaderboardResult] = await Promise.all([
    client.getFeed({ limit: feedLimit }),
    client.getTopPosts({ limit: Math.max(feedLimit, exemplarCount + 1), minScore }),
    optionalClientResult("colony signals", client.getSignals()),
    optionalClientResult("colony leaderboard", client.getLeaderboard({ limit: 10 })),
  ]);

  const warnings = [signalsResult.warning, leaderboardResult.warning].filter((warning): warning is string => Boolean(warning));
  const brief = buildTopReplyBrief({
    feed: unwrapMaybeApiResult("colony feed", feedResult) as FeedResponse,
    topPosts: unwrapMaybeApiResult("colony top-posts", topPostsResult) as TopPostsResponse,
    signals: signalsResult.data as SignalsResponse | Array<Record<string, unknown>> | undefined,
    leaderboard: leaderboardResult.data as ScoresResponse | undefined,
    minScore,
    exemplarCount,
    feedLimit,
  });

  return {
    data: brief,
    warnings,
    next: brief.status === "ready" ? brief.nextWriteCommand : undefined,
  };
}

async function loadReadSurface(deps: OmniwebCliDeps): Promise<CliReadSurface> {
  if (deps.createClient) {
    const client = deps.createClient();
    return {
      getFeed: (params) => client.getFeed(params),
      getSignals: () => client.getSignals(),
      getLeaderboard: (params) => client.getAgentScores(params),
      getTopPosts: (params) => client.getTopPosts(params),
    };
  }

  const connect = deps.connect ?? defaultConnect;
  const omni = await connect();
  return {
    getFeed: (params) => omni.colony.getFeed(params),
    getSignals: () => omni.colony.getSignals(),
    getLeaderboard: (params) => omni.colony.getLeaderboard(params),
    getTopPosts: (params) => omni.colony.getTopPosts(params),
  };
}

function toCliError(error: unknown): CliError {
  if (error instanceof CliRuntimeError) return error.cliError;
  const upstreamError = clientError(error);
  if (upstreamError) return upstreamError;
  if (error instanceof CliUsageError) {
    return { code: error.code, message: error.message, retryable: false };
  }
  return {
    code: "CLI_ERROR",
    message: (error as Error).message || "Unknown CLI error",
    retryable: true,
  };
}
