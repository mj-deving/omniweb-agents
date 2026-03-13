/**
 * Sources module — runtime re-exports.
 *
 * This barrel file exports the runtime API for use by the session loop.
 * Admin operations (discover, test, updateRatings) are exported from admin.ts
 * and should never be imported by session-runner.ts.
 *
 * Runtime API: preflight, match, loadAgentSourceView, catalog operations.
 * Admin operations (discover, test, updateRatings) are in admin.ts.
 */

// ── Types ──────────────────────────────────────────
export type {
  SourceRecordV2,
  SourceRecordV1,
  SourceCatalogFileV2,
  SourceIndex,
  SourceStatus,
  AgentName,
  AgentSourceConfig,
  AgentSourceView,
  SourceRegistryMode,
} from "./catalog.js";

export type {
  PreflightCandidate,
  PreflightResult,
  SourceSelectionResult,
} from "./policy.js";

export type {
  MatchInput,
  MatchResult,
} from "./matcher.js";

// ── Constants ──────────────────────────────────────
export { ALL_AGENT_NAMES } from "./catalog.js";

// ── Catalog Operations ─────────────────────────────
export {
  loadCatalog,
  loadYamlRegistry,
  loadAgentSourceView,
  buildSourceIndex,
  normalizeSourceRecord,
  tokenizeTopic,
  sourceTopicTokens,
} from "./catalog.js";

// ── Source Policy ──────────────────────────────────
export { preflight, selectSourceForTopicV2 } from "./policy.js";

// ── Source Matcher ─────────────────────────────────
export { match, extractClaims, scoreMatch } from "./matcher.js";
