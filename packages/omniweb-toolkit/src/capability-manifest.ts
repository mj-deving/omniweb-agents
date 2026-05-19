import {
  describeRuntimeCapabilities,
  type RuntimeActionCapability,
  type RuntimeActionFamily,
  type RuntimeCapabilityResult,
  type WriteReadinessOptions,
} from "./readiness.js";

export type ToolkitCapabilityDomain =
  | "colony"
  | "identity"
  | "escrow"
  | "storage"
  | "ipfs"
  | "chain";

export type ToolkitCapabilityKind =
  | "read"
  | "write"
  | "verification"
  | "recovery"
  | "discovery"
  | "advanced";

export type ToolkitCapabilityStatus =
  | "available"
  | "blocked"
  | "supervised"
  | "advanced"
  | "degraded"
  | "pending"
  | "unsupported";

export type ToolkitResponseDepth =
  | "summary"
  | "standard"
  | "rich"
  | "full"
  | "lifecycle"
  | "proof";

export type ToolkitCapabilityProofTier =
  | "read_available"
  | "read_live_audited"
  | "no_spend_runtime"
  | "runtime_action_family"
  | "lifecycle_proven"
  | "supervised_identity"
  | "manual_recovery"
  | "advanced_runtime"
  | "experimental_runtime"
  | "pending_current_recheck";

export interface ToolkitCapabilityParameter {
  name: string;
  required: boolean;
  type: string;
  description?: string;
  defaultValue?: string | number | boolean;
  examples?: string[];
  values?: string[];
}

export interface ToolkitCapabilityRequirements {
  wallet: boolean;
  auth: boolean;
  write: boolean;
  spend: boolean;
  attestation: boolean;
  targetPost: boolean;
  marketContext: boolean;
  explicitExecute: boolean;
  optionalDependencies: string[];
}

export interface ToolkitCapabilityLifecycle {
  writesLifecycleRecord: boolean;
  readbackSurfaces: string[];
  statusVocabulary: string[];
}

export interface ToolkitCapabilityManifestEntry {
  id: string;
  domain: ToolkitCapabilityDomain;
  kind: ToolkitCapabilityKind;
  methods: string[];
  status: ToolkitCapabilityStatus;
  params: ToolkitCapabilityParameter[];
  requirements: ToolkitCapabilityRequirements;
  responseDepth: ToolkitResponseDepth;
  proofTier: ToolkitCapabilityProofTier;
  lifecycle: ToolkitCapabilityLifecycle;
  notes: string[];
}

export interface ToolkitCapabilityManifest {
  generatedAt: string;
  source: "omniweb-toolkit";
  recommendedMode: RuntimeCapabilityResult["recommendedMode"];
  authReady: boolean;
  writeReady: boolean;
  blockers: RuntimeCapabilityResult["blockers"];
  capabilities: ToolkitCapabilityManifestEntry[];
  coverage: {
    domains: ToolkitCapabilityDomain[];
    readCapabilities: number;
    writeCapabilities: number;
    lifecycleAwareCapabilities: string[];
    supervisedCapabilities: string[];
    advancedCapabilities: string[];
    blockedCapabilities: string[];
  };
}

export interface ToolkitCapabilityManifestOptions extends WriteReadinessOptions {
  now?: Date;
  runtimeCapabilities?: RuntimeCapabilityResult;
}

interface StaticCapabilitySpec {
  id: string;
  domain: ToolkitCapabilityDomain;
  kind: ToolkitCapabilityKind;
  methods: string[];
  params?: ToolkitCapabilityParameter[];
  requirements?: Partial<ToolkitCapabilityRequirements>;
  responseDepth: ToolkitResponseDepth;
  proofTier: ToolkitCapabilityProofTier;
  lifecycle?: Partial<ToolkitCapabilityLifecycle>;
  notes?: string[];
  statusPolicy?: StatusPolicy;
  runtimeFamily?: RuntimeActionFamily;
}

type StatusPolicy =
  | "always-available"
  | "runtime-action"
  | "wallet-write"
  | "supervised-identity"
  | "advanced-runtime"
  | "manual-recovery"
  | "pending-current-recheck"
  | "degraded-read"
  | "experimental-runtime";

const DEFAULT_REQUIREMENTS: ToolkitCapabilityRequirements = {
  wallet: false,
  auth: false,
  write: false,
  spend: false,
  attestation: false,
  targetPost: false,
  marketContext: false,
  explicitExecute: false,
  optionalDependencies: [],
};

const DEFAULT_LIFECYCLE: ToolkitCapabilityLifecycle = {
  writesLifecycleRecord: false,
  readbackSurfaces: [],
  statusVocabulary: [],
};

const WRITE_LIFECYCLE_VOCABULARY = [
  "planned",
  "broadcasted",
  "pending-chain",
  "chain-confirmed",
  "pending-indexer",
  "indexed",
  "resolved",
  "degraded",
  "expired",
  "failed",
];

const txHashParam: ToolkitCapabilityParameter = {
  name: "txHash",
  required: true,
  type: "string",
  description: "On-chain transaction hash or post hash, depending on method.",
};

const CAPABILITY_SPECS: StaticCapabilitySpec[] = [
  {
    id: "colony.feed",
    domain: "colony",
    kind: "read",
    methods: ["createClient().getFeed", "omni.colony.getFeed"],
    params: [
      { name: "limit", required: false, type: "number", defaultValue: 50 },
      { name: "cursor", required: false, type: "string" },
      { name: "category", required: false, type: "ReadPostCategory|string" },
      { name: "asset", required: false, type: "string" },
      { name: "author", required: false, type: "string" },
      { name: "replies", required: false, type: "boolean" },
    ],
    responseDepth: "standard",
    proofTier: "read_live_audited",
    lifecycle: { readbackSurfaces: ["recent-feed", "category-feed", "author-feed"] },
    notes: [
      "Feed has no server-side since/window parameter in the typed surface; fetch with limit/cursor and filter timestamps client-side.",
      "Use feed readback as one visibility surface, not as proof that every indexed post is top-N visible.",
    ],
  },
  {
    id: "colony.search",
    domain: "colony",
    kind: "read",
    methods: ["createClient().searchFeed", "omni.colony.search"],
    params: [
      { name: "text", required: false, type: "string" },
      { name: "category", required: false, type: "ReadPostCategory|string" },
      { name: "limit", required: false, type: "number" },
      { name: "cursor", required: false, type: "string" },
      { name: "asset", required: false, type: "string" },
      { name: "author", required: false, type: "string" },
      { name: "replies", required: false, type: "boolean" },
    ],
    responseDepth: "standard",
    proofTier: "read_live_audited",
    lifecycle: { readbackSurfaces: ["search-feed", "category-search"] },
  },
  {
    id: "colony.post-detail",
    domain: "colony",
    kind: "read",
    methods: ["omni.colony.getPostDetail"],
    params: [txHashParam],
    responseDepth: "rich",
    proofTier: "read_live_audited",
    lifecycle: { readbackSurfaces: ["post-detail", "thread"] },
    notes: ["Post detail/thread is the deeper readback surface for replies and delayed feed visibility."],
  },
  {
    id: "colony.signals",
    domain: "colony",
    kind: "read",
    methods: ["omni.colony.getSignals", "omni.colony.getConvergence", "omni.colony.getReport"],
    params: [{ name: "id", required: false, type: "string" }],
    responseDepth: "rich",
    proofTier: "read_live_audited",
    lifecycle: { readbackSurfaces: ["signals", "convergence", "reports"] },
  },
  {
    id: "colony.scoring",
    domain: "colony",
    kind: "read",
    methods: [
      "omni.colony.getLeaderboard",
      "omni.colony.getTopPosts",
      "omni.colony.getPredictionLeaderboard",
      "omni.colony.getPredictionScore",
      "omni.colony.getForecastScore",
    ],
    params: [
      { name: "address", required: false, type: "string" },
      { name: "limit", required: false, type: "number" },
      { name: "minScore", required: false, type: "number" },
    ],
    responseDepth: "standard",
    proofTier: "read_available",
    lifecycle: { readbackSurfaces: ["leaderboard", "top-posts", "prediction-score"] },
  },
  {
    id: "colony.account-stats",
    domain: "colony",
    kind: "read",
    methods: ["createClient().getBalance", "createClient().getStats", "omni.colony.getBalance", "omni.colony.getAgentBalance"],
    params: [{ name: "address", required: false, type: "string" }],
    responseDepth: "standard",
    proofTier: "read_available",
    lifecycle: { readbackSurfaces: ["balance", "agent-balance", "network-stats"] },
  },
  {
    id: "colony.markets.read",
    domain: "colony",
    kind: "read",
    methods: [
      "omni.colony.getOracle",
      "omni.colony.getPrices",
      "omni.colony.getPriceHistory",
      "omni.colony.getMarkets",
      "omni.colony.getPredictions",
      "omni.colony.getPredictionIntelligence",
      "omni.colony.getPredictionRecommendations",
    ],
    params: [
      { name: "assets", required: false, type: "string[]", examples: ["BTC", "ETH", "XAU"] },
      { name: "asset", required: false, type: "string" },
      {
        name: "window",
        required: false,
        type: "string",
        defaultValue: "24h",
        examples: ["30m", "1h", "4h", "12h", "24h"],
        description: "Oracle lookback window; passed through to the host when supported.",
      },
      {
        name: "periods",
        required: false,
        type: "number",
        defaultValue: 24,
        examples: ["24", "48", "168"],
        description: "Price-history period count, not a direct hours string.",
      },
      { name: "userAddress", required: false, type: "string" },
    ],
    responseDepth: "rich",
    proofTier: "read_live_audited",
    lifecycle: { readbackSurfaces: ["oracle", "prices", "price-history", "prediction-intelligence"] },
  },
  {
    id: "colony.pools.read",
    domain: "colony",
    kind: "read",
    methods: [
      "omni.colony.getPool",
      "omni.colony.getHigherLowerPool",
      "omni.colony.getBinaryPools",
      "omni.colony.getEthPool",
      "omni.colony.getEthWinners",
      "omni.colony.getSportsMarkets",
      "omni.colony.getSportsPool",
      "omni.colony.getSportsWinners",
      "omni.colony.getCommodityPool",
    ],
    params: [
      { name: "asset", required: false, type: "string", defaultValue: "BTC", examples: ["BTC", "ETH", "XAU"] },
      {
        name: "horizon",
        required: false,
        type: "string",
        defaultValue: "30m",
        examples: ["30m", "1h", "4h", "12h", "24h"],
        description: "Pool horizon for fixed, higher/lower, ETH, and commodity pool reads.",
      },
      { name: "fixtureId", required: false, type: "string" },
      { name: "status", required: false, type: "string", defaultValue: "upcoming", examples: ["upcoming", "active", "settled"] },
      { name: "category", required: false, type: "string" },
      { name: "limit", required: false, type: "number" },
    ],
    responseDepth: "rich",
    proofTier: "read_live_audited",
    lifecycle: { readbackSurfaces: ["active-pool", "higher-lower-pool", "winners-history", "sports-pool"] },
  },
  {
    id: "colony.publish",
    domain: "colony",
    kind: "write",
    methods: ["omni.colony.publish"],
    params: [
      { name: "text", required: true, type: "string" },
      { name: "category", required: true, type: "ReadPostCategory|string" },
      { name: "attestUrl", required: true, type: "string" },
    ],
    requirements: { wallet: true, auth: true, write: true, spend: true, attestation: true, explicitExecute: true },
    responseDepth: "proof",
    proofTier: "lifecycle_proven",
    lifecycle: {
      writesLifecycleRecord: true,
      readbackSurfaces: ["chain", "attestation", "recent-feed", "author-feed", "post-detail"],
      statusVocabulary: WRITE_LIFECYCLE_VOCABULARY,
    },
    statusPolicy: "runtime-action",
    runtimeFamily: "publish",
  },
  {
    id: "colony.reply",
    domain: "colony",
    kind: "write",
    methods: ["omni.colony.reply"],
    params: [
      txHashParam,
      { name: "text", required: true, type: "string" },
      { name: "attestUrl", required: true, type: "string" },
    ],
    requirements: {
      wallet: true,
      auth: true,
      write: true,
      spend: true,
      attestation: true,
      targetPost: true,
      explicitExecute: true,
    },
    responseDepth: "proof",
    proofTier: "lifecycle_proven",
    lifecycle: {
      writesLifecycleRecord: true,
      readbackSurfaces: ["chain", "attestation", "post-detail", "thread", "recent-feed"],
      statusVocabulary: WRITE_LIFECYCLE_VOCABULARY,
    },
    statusPolicy: "runtime-action",
    runtimeFamily: "reply",
    notes: ["Reply has a deeper thread readback surface than recent-feed visibility."],
  },
  {
    id: "colony.attest",
    domain: "colony",
    kind: "verification",
    methods: ["omni.colony.attest"],
    params: [{ name: "url", required: true, type: "string" }],
    requirements: { wallet: true, auth: true, write: true, spend: true, attestation: true, explicitExecute: true },
    responseDepth: "proof",
    proofTier: "runtime_action_family",
    lifecycle: { readbackSurfaces: ["attestation-tx"] },
    statusPolicy: "wallet-write",
  },
  {
    id: "colony.attest-tlsn",
    domain: "colony",
    kind: "verification",
    methods: ["omni.colony.attestTlsn"],
    params: [{ name: "url", required: true, type: "string" }],
    requirements: {
      wallet: true,
      auth: true,
      write: true,
      spend: true,
      attestation: true,
      explicitExecute: true,
      optionalDependencies: ["playwright", "tlsn-js"],
    },
    responseDepth: "proof",
    proofTier: "experimental_runtime",
    lifecycle: { readbackSurfaces: ["tlsn-proof", "attestation-tx"] },
    statusPolicy: "experimental-runtime",
  },
  {
    id: "colony.publish-vote",
    domain: "colony",
    kind: "write",
    methods: ["omni.colony.publishVote"],
    params: [
      { name: "asset", required: true, type: "string" },
      { name: "predictedPrice", required: true, type: "number" },
      { name: "referencePrice", required: true, type: "number" },
      { name: "attestUrl", required: false, type: "string" },
    ],
    requirements: { wallet: true, auth: true, write: true, spend: true, attestation: false, explicitExecute: true },
    responseDepth: "proof",
    proofTier: "lifecycle_proven",
    lifecycle: {
      writesLifecycleRecord: true,
      readbackSurfaces: ["chain", "VOTE-search", "category-feed"],
      statusVocabulary: WRITE_LIFECYCLE_VOCABULARY,
    },
    statusPolicy: "runtime-action",
    runtimeFamily: "publish",
    notes: ["VOTE is separate from DEM pool betting."],
  },
  {
    id: "colony.react",
    domain: "colony",
    kind: "write",
    methods: ["omni.colony.react"],
    params: [
      txHashParam,
      { name: "type", required: true, type: '"agree"|"disagree"|"flag"|null' },
    ],
    requirements: {
      wallet: true,
      auth: true,
      write: true,
      spend: false,
      attestation: false,
      targetPost: true,
      explicitExecute: true,
    },
    responseDepth: "lifecycle",
    proofTier: "lifecycle_proven",
    lifecycle: {
      writesLifecycleRecord: true,
      readbackSurfaces: ["reaction-summary", "myReaction", "post-detail"],
      statusVocabulary: WRITE_LIFECYCLE_VOCABULARY,
    },
    statusPolicy: "runtime-action",
    runtimeFamily: "react",
  },
  {
    id: "colony.tip",
    domain: "colony",
    kind: "write",
    methods: ["omni.colony.tip"],
    params: [
      txHashParam,
      { name: "amount", required: true, type: "number", description: "Local wrapper clamps tips to 1-10 DEM." },
    ],
    requirements: { wallet: true, auth: true, write: true, spend: true, targetPost: true, explicitExecute: true },
    responseDepth: "lifecycle",
    proofTier: "lifecycle_proven",
    lifecycle: {
      writesLifecycleRecord: true,
      readbackSurfaces: ["chain", "post-tip-stats", "recipient-tip-stats", "balance"],
      statusVocabulary: WRITE_LIFECYCLE_VOCABULARY,
    },
    statusPolicy: "runtime-action",
    runtimeFamily: "tip",
  },
  {
    id: "colony.bet-fixed",
    domain: "colony",
    kind: "write",
    methods: ["omni.colony.placeBet"],
    params: [
      { name: "asset", required: true, type: "string" },
      { name: "price", required: true, type: "number" },
      { name: "horizon", required: false, type: "string" },
    ],
    requirements: { wallet: true, auth: true, write: true, spend: true, marketContext: true, explicitExecute: true },
    responseDepth: "proof",
    proofTier: "lifecycle_proven",
    lifecycle: {
      writesLifecycleRecord: true,
      readbackSurfaces: ["chain", "active-pool", "resolved-winners"],
      statusVocabulary: WRITE_LIFECYCLE_VOCABULARY,
    },
    statusPolicy: "runtime-action",
    runtimeFamily: "bet",
  },
  {
    id: "colony.bet-higher-lower",
    domain: "colony",
    kind: "write",
    methods: ["omni.colony.placeHL"],
    params: [
      { name: "asset", required: true, type: "string" },
      { name: "direction", required: true, type: '"higher"|"lower"', values: ["higher", "lower"] },
      { name: "horizon", required: false, type: "string" },
    ],
    requirements: { wallet: true, auth: true, write: true, spend: true, marketContext: true, explicitExecute: true },
    responseDepth: "proof",
    proofTier: "pending_current_recheck",
    lifecycle: {
      writesLifecycleRecord: true,
      readbackSurfaces: ["chain", "higher-lower-pool", "resolved-winners"],
      statusVocabulary: WRITE_LIFECYCLE_VOCABULARY,
    },
    statusPolicy: "pending-current-recheck",
    runtimeFamily: "bet",
  },
  {
    id: "colony.bet-recovery",
    domain: "colony",
    kind: "recovery",
    methods: ["omni.colony.registerBet", "omni.colony.registerHL", "omni.colony.registerEthBinaryBet"],
    params: [
      txHashParam,
      { name: "asset", required: false, type: "string" },
      { name: "predictedPrice", required: false, type: "number" },
      { name: "direction", required: false, type: '"higher"|"lower"' },
    ],
    requirements: { wallet: true, auth: true, write: true, marketContext: true, explicitExecute: true },
    responseDepth: "proof",
    proofTier: "manual_recovery",
    lifecycle: { readbackSurfaces: ["registration-response", "active-pool", "resolved-winners"] },
    statusPolicy: "manual-recovery",
    notes: ["Registration helpers are recovery routes, not primary DEM proof lanes."],
  },
  {
    id: "colony.engagement-reads",
    domain: "colony",
    kind: "read",
    methods: ["omni.colony.getReactions", "omni.colony.getTipStats", "omni.colony.getAgentTipStats"],
    params: [txHashParam, { name: "address", required: false, type: "string" }],
    responseDepth: "standard",
    proofTier: "read_available",
    lifecycle: { readbackSurfaces: ["reaction-summary", "post-tip-stats", "agent-tip-stats"] },
  },
  {
    id: "colony.identity",
    domain: "colony",
    kind: "write",
    methods: [
      "omni.colony.register",
      "omni.colony.createAgentLinkChallenge",
      "omni.colony.claimAgentLink",
      "omni.colony.approveAgentLink",
      "omni.colony.unlinkAgent",
    ],
    params: [
      { name: "agentAddress", required: false, type: "string" },
      { name: "challengeId", required: false, type: "string" },
      { name: "signature", required: false, type: "string" },
    ],
    requirements: { wallet: true, auth: true, write: true, explicitExecute: true },
    responseDepth: "proof",
    proofTier: "supervised_identity",
    lifecycle: { readbackSurfaces: ["agent-profile", "linked-agents", "post-cleanup-readback"] },
    statusPolicy: "supervised-identity",
    notes: ["Identity mutation is supervised and must not persist challenge secrets or approval tokens."],
  },
  {
    id: "colony.identity-reads",
    domain: "colony",
    kind: "read",
    methods: ["omni.colony.lookupIdentity", "omni.colony.getAgentIdentities", "omni.colony.getLinkedAgents"],
    params: [
      { name: "address", required: false, type: "string" },
      { name: "platform", required: false, type: "string" },
      { name: "username", required: false, type: "string" },
    ],
    responseDepth: "rich",
    proofTier: "read_available",
    lifecycle: { readbackSurfaces: ["identity-lookup", "agent-identities", "linked-agents"] },
  },
  {
    id: "colony.webhooks",
    domain: "colony",
    kind: "advanced",
    methods: ["omni.colony.getWebhooks", "omni.colony.createWebhook", "omni.colony.deleteWebhook"],
    params: [
      { name: "url", required: false, type: "string" },
      { name: "events", required: false, type: "string[]" },
      { name: "webhookId", required: false, type: "string" },
    ],
    requirements: { wallet: true, auth: true, write: true, explicitExecute: true },
    responseDepth: "standard",
    proofTier: "advanced_runtime",
    lifecycle: { readbackSurfaces: ["webhook-list"] },
    statusPolicy: "advanced-runtime",
  },
  {
    id: "identity.web2",
    domain: "identity",
    kind: "advanced",
    methods: ["omni.identity.lookup", "omni.identity.link", "omni.identity.getIdentities", "omni.identity.createProof"],
    params: [
      { name: "platform", required: false, type: '"twitter"|"github"|"discord"|"telegram"' },
      { name: "username", required: false, type: "string" },
      { name: "proofUrl", required: false, type: "string" },
    ],
    requirements: { wallet: true, auth: true, write: true, explicitExecute: true },
    responseDepth: "rich",
    proofTier: "advanced_runtime",
    lifecycle: { readbackSurfaces: ["web2-lookup", "linked-identities"] },
    statusPolicy: "advanced-runtime",
  },
  {
    id: "escrow.identity",
    domain: "escrow",
    kind: "advanced",
    methods: [
      "omni.escrow.sendToIdentity",
      "omni.escrow.claimEscrow",
      "omni.escrow.refundExpired",
      "omni.escrow.getClaimable",
      "omni.escrow.getEscrowBalance",
    ],
    params: [
      { name: "platform", required: true, type: '"twitter"|"github"|"telegram"' },
      { name: "username", required: true, type: "string" },
      { name: "amount", required: false, type: "number" },
    ],
    requirements: { wallet: true, auth: true, write: true, spend: true, explicitExecute: true },
    responseDepth: "proof",
    proofTier: "advanced_runtime",
    lifecycle: { readbackSurfaces: ["escrow-balance", "claimable-escrows", "chain"] },
    statusPolicy: "advanced-runtime",
  },
  {
    id: "storage.programs",
    domain: "storage",
    kind: "advanced",
    methods: ["omni.storage.read", "omni.storage.list", "omni.storage.search", "omni.storage.hasField", "omni.storage.readField"],
    params: [
      { name: "storageAddress", required: false, type: "string" },
      { name: "field", required: false, type: "string" },
      { name: "query", required: false, type: "string" },
    ],
    responseDepth: "rich",
    proofTier: "advanced_runtime",
    lifecycle: { readbackSurfaces: ["storage-program-rpc", "recent-storage-transactions"] },
    statusPolicy: "degraded-read",
    notes: ["Storage reads include fallback reconstruction from confirmed storageProgram transactions when RPC read drifts."],
  },
  {
    id: "ipfs.storage",
    domain: "ipfs",
    kind: "advanced",
    methods: ["omni.ipfs.upload", "omni.ipfs.pin", "omni.ipfs.unpin"],
    params: [
      { name: "content", required: false, type: "string|Uint8Array" },
      { name: "cid", required: false, type: "string" },
      { name: "duration", required: false, type: "number" },
    ],
    requirements: { wallet: true, auth: true, write: true, spend: true, explicitExecute: true },
    responseDepth: "proof",
    proofTier: "advanced_runtime",
    lifecycle: { readbackSurfaces: ["chain", "ipfs-pin-state"] },
    statusPolicy: "advanced-runtime",
  },
  {
    id: "chain.core",
    domain: "chain",
    kind: "advanced",
    methods: [
      "omni.chain.transfer",
      "omni.chain.getBalance",
      "omni.chain.signMessage",
      "omni.chain.verifyMessage",
      "omni.chain.getBlockNumber",
    ],
    params: [
      { name: "to", required: false, type: "string" },
      { name: "amount", required: false, type: "number" },
      { name: "memo", required: false, type: "string" },
      { name: "message", required: false, type: "string" },
    ],
    requirements: { wallet: true, auth: true, write: true, spend: true, explicitExecute: true },
    responseDepth: "standard",
    proofTier: "advanced_runtime",
    lifecycle: { readbackSurfaces: ["chain", "balance", "block-number"] },
    statusPolicy: "advanced-runtime",
  },
];

export function buildToolkitCapabilityManifest(
  options: ToolkitCapabilityManifestOptions = {},
): ToolkitCapabilityManifest {
  const runtime = options.runtimeCapabilities ?? describeRuntimeCapabilities(options);
  const capabilities = CAPABILITY_SPECS.map((spec) => materializeCapability(spec, runtime));
  const domains = Array.from(new Set(capabilities.map((capability) => capability.domain)));

  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    source: "omniweb-toolkit",
    recommendedMode: runtime.recommendedMode,
    authReady: runtime.authReady,
    writeReady: runtime.writeReady,
    blockers: [...runtime.blockers],
    capabilities,
    coverage: {
      domains,
      readCapabilities: capabilities.filter((capability) => capability.kind === "read").length,
      writeCapabilities: capabilities.filter((capability) => capability.requirements.write).length,
      lifecycleAwareCapabilities: capabilities
        .filter((capability) => capability.lifecycle.writesLifecycleRecord)
        .map((capability) => capability.id),
      supervisedCapabilities: capabilities
        .filter((capability) => capability.status === "supervised")
        .map((capability) => capability.id),
      advancedCapabilities: capabilities
        .filter((capability) => capability.status === "advanced")
        .map((capability) => capability.id),
      blockedCapabilities: capabilities
        .filter((capability) => capability.status === "blocked")
        .map((capability) => capability.id),
    },
  };
}

export const describeToolkitCapabilities = buildToolkitCapabilityManifest;

function materializeCapability(
  spec: StaticCapabilitySpec,
  runtime: RuntimeCapabilityResult,
): ToolkitCapabilityManifestEntry {
  const runtimeFamily = spec.runtimeFamily ? runtime.actionFamilies[spec.runtimeFamily] : undefined;
  const status = statusForSpec(spec, runtime, runtimeFamily);
  return {
    id: spec.id,
    domain: spec.domain,
    kind: spec.kind,
    methods: [...spec.methods],
    status,
    params: [...(spec.params ?? [])],
    requirements: {
      ...DEFAULT_REQUIREMENTS,
      ...requirementsFromRuntimeFamily(runtimeFamily),
      ...(spec.requirements ?? {}),
    },
    responseDepth: spec.responseDepth,
    proofTier: spec.proofTier,
    lifecycle: {
      writesLifecycleRecord: spec.lifecycle?.writesLifecycleRecord ?? DEFAULT_LIFECYCLE.writesLifecycleRecord,
      readbackSurfaces: [...(spec.lifecycle?.readbackSurfaces ?? DEFAULT_LIFECYCLE.readbackSurfaces)],
      statusVocabulary: [...(spec.lifecycle?.statusVocabulary ?? DEFAULT_LIFECYCLE.statusVocabulary)],
    },
    notes: [
      ...(spec.notes ?? []),
      ...(runtimeFamily?.notes ?? []),
      ...notesForStatus(status, runtime),
    ],
  };
}

function statusForSpec(
  spec: StaticCapabilitySpec,
  runtime: RuntimeCapabilityResult,
  runtimeFamily: RuntimeActionCapability | undefined,
): ToolkitCapabilityStatus {
  const policy = spec.statusPolicy ?? "always-available";
  if (policy === "always-available") return "available";
  if (policy === "degraded-read") return "degraded";
  if (policy === "pending-current-recheck") {
    return runtimeFamily?.readiness === "ready" ? "pending" : "blocked";
  }
  if (policy === "supervised-identity") {
    return runtime.authReady ? "supervised" : "blocked";
  }
  if (policy === "manual-recovery" || policy === "advanced-runtime" || policy === "experimental-runtime") {
    return runtime.writeReady ? "advanced" : "blocked";
  }
  if (policy === "wallet-write") {
    return runtime.writeReady ? "available" : "blocked";
  }
  if (policy === "runtime-action") {
    if (!runtimeFamily || runtimeFamily.readiness === "unsupported" || !runtimeFamily.executable) return "unsupported";
    return runtimeFamily.readiness === "ready" ? "available" : "blocked";
  }
  return "unsupported";
}

function requirementsFromRuntimeFamily(
  capability: RuntimeActionCapability | undefined,
): Partial<ToolkitCapabilityRequirements> {
  if (!capability) return {};
  return {
    wallet: capability.requiresWallet,
    auth: capability.requiresWallet,
    write: capability.requiresWallet,
    spend: capability.requiresWallet,
    attestation: capability.requiresAttestation,
    targetPost: capability.requiresTargetPost,
    marketContext: capability.requiresMarketContext,
    explicitExecute: capability.requiresWallet,
  };
}

function notesForStatus(status: ToolkitCapabilityStatus, runtime: RuntimeCapabilityResult): string[] {
  if (status !== "blocked") return [];
  if (runtime.blockers.length === 0) return ["Blocked by capability-specific runtime state."];
  return [`Blocked by runtime readiness: ${runtime.blockers.join(", ")}.`];
}
