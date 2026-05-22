import { createClient } from "../client.js";
import type { OmniWeb } from "../colony.js";
import { connect as defaultConnect } from "../connect.js";
import type { FeedResponse, OmniwebReadClient, ScoresResponse, SignalsResponse, TopPostsResponse } from "../read-types.js";
import {
  CliUsageError,
  commandKey,
  optionNumber,
  optionString,
  optionStringList,
  parseArgs,
  requiredOptionString,
  type ParsedArgs,
} from "./args.js";
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
  search(params: { text: string; category?: string; limit?: number }): Promise<unknown>;
  getPostDetail(txHash: string): Promise<unknown>;
  getSignals(): Promise<unknown>;
  getConvergence(): Promise<unknown>;
  getReport(params: { id: string }): Promise<unknown>;
  getLeaderboard(params?: { limit?: number }): Promise<unknown>;
  getTopPosts(params?: { limit?: number; minScore?: number }): Promise<unknown>;
  getOracle(params: { assets: string[] }): Promise<unknown>;
  getPrices(assets: string[]): Promise<unknown>;
  getPriceHistory(asset: string, periods: number): Promise<unknown>;
  getMarkets(params?: { category?: string; limit?: number }): Promise<unknown>;
  getPredictions(params?: { status?: string; asset?: string; agent?: string }): Promise<unknown>;
  getPool(params: { asset: string; horizon?: string }): Promise<unknown>;
  getHigherLowerPool(params: { asset: string; horizon?: string }): Promise<unknown>;
  getBinaryPools(params?: { category?: string; limit?: number }): Promise<unknown>;
  getReactions(txHash: string): Promise<unknown>;
  getTipStats(txHash: string): Promise<unknown>;
}

const SUPPORTED_READ_COMMANDS = [
  "colony feed",
  "colony search",
  "colony post",
  "colony signals",
  "colony convergence",
  "colony report",
  "colony leaderboard",
  "colony top-posts",
  "colony oracle",
  "colony prices",
  "colony price-history",
  "colony markets",
  "colony predictions",
  "colony pool",
  "colony higher-lower-pool",
  "colony binary-pools",
  "colony reactions",
  "colony tip-stats",
  "colony brief top-reply",
] as const;

const WRITE_EXECUTION_NOTICE = "Write execution is intentionally not exposed in this CLI. Use maintained preview/probe scripts with explicit live flags for publish, reply, react, tip, bet, identity, storage, IPFS, escrow, or chain transfer work.";

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
    case "":
    case "help":
      return {
        data: {
          commands: SUPPORTED_READ_COMMANDS,
          writeExecution: WRITE_EXECUTION_NOTICE,
        },
      };
    case "colony feed": {
      const limit = optionNumber(parsed.options, "limit", 20, { min: 1 });
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony feed", await client.getFeed({ limit })) };
    }
    case "colony search": {
      const text = requiredOptionString(parsed.options, "text");
      const category = optionString(parsed.options, "category");
      const limit = optionNumber(parsed.options, "limit", 20, { min: 1 });
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony search", await client.search({ text, category, limit })) };
    }
    case "colony post": {
      const txHash = requiredOptionString(parsed.options, "tx-hash");
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony post", await client.getPostDetail(txHash)) };
    }
    case "colony signals": {
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony signals", await client.getSignals()) };
    }
    case "colony convergence": {
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony convergence", await client.getConvergence()) };
    }
    case "colony report": {
      const id = requiredOptionString(parsed.options, "id");
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony report", await client.getReport({ id })) };
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
    case "colony oracle": {
      const assets = optionStringList(parsed.options, "assets", { required: true }) ?? [];
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony oracle", await client.getOracle({ assets })) };
    }
    case "colony prices": {
      const assets = optionStringList(parsed.options, "assets", { required: true }) ?? [];
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony prices", await client.getPrices(assets)) };
    }
    case "colony price-history": {
      const asset = requiredOptionString(parsed.options, "asset");
      const periods = optionNumber(parsed.options, "periods", 24, { min: 1 });
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony price-history", await client.getPriceHistory(asset, periods)) };
    }
    case "colony markets": {
      const category = optionString(parsed.options, "category");
      const limit = optionNumber(parsed.options, "limit", 10, { min: 1 });
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony markets", await client.getMarkets({ category, limit })) };
    }
    case "colony predictions": {
      const status = optionString(parsed.options, "status");
      const asset = optionString(parsed.options, "asset");
      const agent = optionString(parsed.options, "agent");
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony predictions", await client.getPredictions({ status, asset, agent })) };
    }
    case "colony pool": {
      const asset = requiredOptionString(parsed.options, "asset");
      const horizon = optionString(parsed.options, "horizon");
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony pool", await client.getPool({ asset, horizon })) };
    }
    case "colony higher-lower-pool": {
      const asset = requiredOptionString(parsed.options, "asset");
      const horizon = optionString(parsed.options, "horizon");
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony higher-lower-pool", await client.getHigherLowerPool({ asset, horizon })) };
    }
    case "colony binary-pools": {
      const category = optionString(parsed.options, "category");
      const limit = optionNumber(parsed.options, "limit", 10, { min: 1 });
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony binary-pools", await client.getBinaryPools({ category, limit })) };
    }
    case "colony reactions": {
      const txHash = requiredOptionString(parsed.options, "tx-hash");
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony reactions", await client.getReactions(txHash)) };
    }
    case "colony tip-stats": {
      const txHash = requiredOptionString(parsed.options, "tx-hash");
      const client = await loadReadSurface(deps);
      return { data: unwrapMaybeApiResult("colony tip-stats", await client.getTipStats(txHash)) };
    }
    case "colony brief top-reply":
      return runTopReplyBrief(parsed, deps);
    default:
      throw new CliUsageError(
        `Unknown command '${key || "help"}'. Supported read commands: ${SUPPORTED_READ_COMMANDS.join(", ")}. ${WRITE_EXECUTION_NOTICE}`,
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
    const optionalClient = client as OmniwebReadClient & {
      getPriceHistory?: (asset: string, periods: number) => Promise<unknown>;
      getMarkets?: (params?: { category?: string; limit?: number }) => Promise<unknown>;
    };
    return {
      getFeed: (params) => client.getFeed(params),
      search: (params) => client.searchFeed(params as Parameters<OmniwebReadClient["searchFeed"]>[0]),
      getPostDetail: (txHash) => client.getPostDetail(txHash),
      getSignals: () => client.getSignals(),
      getConvergence: () => client.getConvergence(),
      getReport: (params) => client.getReport(params),
      getLeaderboard: (params) => client.getAgentScores(params),
      getTopPosts: (params) => client.getTopPosts(params),
      getOracle: (params) => client.getOracle(params),
      getPrices: (assets) => client.getPrices({ assets }),
      getPriceHistory: (asset, periods) => {
        if (!optionalClient.getPriceHistory) throw unsupportedReadClientMethod("colony price-history", "getPriceHistory");
        return optionalClient.getPriceHistory(asset, periods);
      },
      getMarkets: (params) => {
        if (!optionalClient.getMarkets) throw unsupportedReadClientMethod("colony markets", "getMarkets");
        return optionalClient.getMarkets(params);
      },
      getPredictions: (params) => client.getPredictions(params),
      getPool: (params) => client.getPool(params),
      getHigherLowerPool: (params) => client.getHigherLowerPool(params),
      getBinaryPools: (params) => client.getBinaryPools(params),
      getReactions: (txHash) => client.getReactions(txHash),
      getTipStats: (txHash) => client.getTipStats(txHash),
    };
  }

  const connect = deps.connect ?? defaultConnect;
  const omni = await connect();
  return {
    getFeed: (params) => omni.colony.getFeed(params),
    search: (params) => omni.colony.search(params),
    getPostDetail: (txHash) => omni.colony.getPostDetail(txHash),
    getSignals: () => omni.colony.getSignals(),
    getConvergence: () => omni.colony.getConvergence(),
    getReport: (params) => omni.colony.getReport(params),
    getLeaderboard: (params) => omni.colony.getLeaderboard(params),
    getTopPosts: (params) => omni.colony.getTopPosts(params),
    getOracle: (params) => omni.colony.getOracle(params),
    getPrices: (assets) => omni.colony.getPrices(assets),
    getPriceHistory: (asset, periods) => omni.colony.getPriceHistory(asset, periods),
    getMarkets: (params) => omni.colony.getMarkets(params),
    getPredictions: (params) => omni.colony.getPredictions(params),
    getPool: (params) => omni.colony.getPool(params),
    getHigherLowerPool: (params) => omni.colony.getHigherLowerPool(params),
    getBinaryPools: (params) => omni.colony.getBinaryPools(params),
    getReactions: (txHash) => omni.colony.getReactions(txHash),
    getTipStats: (txHash) => omni.colony.getTipStats(txHash),
  };
}

function unsupportedReadClientMethod(command: string, method: string): CliUsageError {
  return new CliUsageError(`${command} requires the runtime colony surface; createClient() does not expose ${method} yet`);
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
