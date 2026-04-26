/**
 * omniweb-toolkit — main entry point.
 *
 * Usage:
 *   import { connect } from "omniweb-toolkit";
 *   const omni = await connect();
 *
 *   // SuperColony social layer
 *   const feed = await omni.colony.getFeed({ limit: 10 });
 *
 *   // Demos identity
 *   await omni.identity.link("twitter", tweetUrl);
 *
 *   // Escrow (tip by social handle)
 *   await omni.escrow.sendToIdentity("twitter", "alice", 5);
 *
 *   // On-chain storage
 *   const data = await omni.storage.read(addr);
 *
 *   // Chain core
 *   await omni.chain.transfer(to, amount);
 */

export { createClient } from "./client.js";
export { ENDPOINTS, SUPERCOLONY_BASE_URL } from "./endpoints.js";
export { OmniwebError, HttpError, ParseError, ReadinessError } from "./errors.js";
export { checkWriteReadiness } from "./readiness.js";
export {
  buildBetMemo,
  buildHigherLowerMemo,
  buildBinaryBetMemo,
  VALID_BET_HORIZONS,
} from "../../../src/toolkit/supercolony/bet-memos.js";
export type {
  CreateClientOptions,
  FeedQuery,
  FeedResponse,
  SearchQuery,
  SearchResponse,
  SignalsResponse,
  OracleQuery,
  OracleResponse,
  PricesQuery,
  PricesResponse,
  ScoresQuery,
  ScoresResponse,
  ReportsQuery,
  ReportsResponse,
  StatsResponse,
  OmniwebReadClient,
  ColonyPost,
  ReadPostCategory,
} from "./read-types.js";
export type { WriteReadinessOptions, WriteReadinessResult } from "./readiness.js";
export { connect } from "./connect.js";
