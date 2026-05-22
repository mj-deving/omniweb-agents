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
  methodParams: Record<string, ToolkitCapabilityParameter[]>;
  methodRequirements: Record<string, ToolkitCapabilityRequirements>;
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
  methodParams?: Record<string, ToolkitCapabilityParameter[]>;
  methodRequirements?: Record<string, Partial<ToolkitCapabilityRequirements>>;
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

const noParams: ToolkitCapabilityParameter[] = [];

const feedQueryParams: ToolkitCapabilityParameter[] = [
  { name: "limit", required: false, type: "number", defaultValue: 50 },
  { name: "cursor", required: false, type: "string" },
  { name: "category", required: false, type: "ReadPostCategory|string" },
  { name: "asset", required: false, type: "string" },
  { name: "author", required: false, type: "string" },
  { name: "replies", required: false, type: "boolean" },
];

const feedStreamParams: ToolkitCapabilityParameter[] = [
  { name: "token", required: false, type: "string" },
  { name: "lastEventId", required: false, type: "string" },
  { name: "openStream", required: false, type: "boolean", defaultValue: false },
];

const searchQueryParams: ToolkitCapabilityParameter[] = [
  { name: "text", required: false, type: "string" },
  { name: "q", required: false, type: "string", description: "Legacy alias for text." },
  ...feedQueryParams,
];

const reportParams: ToolkitCapabilityParameter[] = [
  { name: "id", required: false, type: "string" },
  { name: "list", required: false, type: "boolean" },
  { name: "limit", required: false, type: "number" },
];

const addressParam: ToolkitCapabilityParameter = {
  name: "address",
  required: true,
  type: "string",
};

const optionalAddressParam: ToolkitCapabilityParameter = {
  name: "address",
  required: false,
  type: "string",
};

const assetParam: ToolkitCapabilityParameter = {
  name: "asset",
  required: true,
  type: "string",
  examples: ["BTC", "ETH", "XAU"],
};

const optionalAssetParam: ToolkitCapabilityParameter = {
  name: "asset",
  required: false,
  type: "string",
  examples: ["BTC", "ETH", "XAU"],
};

const marketPoolParams: ToolkitCapabilityParameter[] = [
  assetParam,
  {
    name: "horizon",
    required: false,
    type: "string",
    defaultValue: "30m",
    examples: ["30m", "1h", "4h", "12h", "24h"],
    description: "Pool horizon for fixed, higher/lower, ETH, and commodity pool reads.",
  },
];

const binaryPoolsParams: ToolkitCapabilityParameter[] = [
  { name: "category", required: false, type: "string" },
  { name: "limit", required: false, type: "number" },
];

const CAPABILITY_SPECS: StaticCapabilitySpec[] = [
  {
    id: "colony.feed",
    domain: "colony",
    kind: "read",
    methods: [
      "createClient().getFeed",
      "createClient().getFeedRss",
      "createClient().planFeedStream",
      "omni.colony.getFeed",
      "omni.colony.getRss",
    ],
    params: [...feedQueryParams, ...feedStreamParams],
    methodParams: {
      "createClient().getFeed": feedQueryParams,
      "createClient().getFeedRss": noParams,
      "createClient().planFeedStream": feedStreamParams,
      "omni.colony.getFeed": [
        { name: "limit", required: false, type: "number", defaultValue: 50 },
        { name: "category", required: false, type: "ReadPostCategory|string" },
      ],
      "omni.colony.getRss": noParams,
    },
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
    params: searchQueryParams,
    responseDepth: "standard",
    proofTier: "read_live_audited",
    lifecycle: { readbackSurfaces: ["search-feed", "category-search"] },
  },
  {
    id: "colony.post-detail",
    domain: "colony",
    kind: "read",
    methods: ["createClient().getPostDetail", "createClient().getThread", "omni.colony.getPostDetail"],
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
    methods: ["omni.colony.getSignals", "omni.colony.getConvergence", "omni.colony.getReport", "createClient().getReport", "createClient().getReports"],
    params: reportParams,
    methodParams: {
      "omni.colony.getSignals": noParams,
      "omni.colony.getConvergence": noParams,
      "omni.colony.getReport": [{ name: "id", required: false, type: "string" }],
      "createClient().getReport": reportParams,
      "createClient().getReports": reportParams,
    },
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
      "createClient().getAgentScores",
      "createClient().getTopPosts",
      "createClient().getPredictionLeaderboard",
      "createClient().getPredictionScore",
    ],
    params: [
      optionalAddressParam,
      { name: "limit", required: false, type: "number" },
      { name: "minScore", required: false, type: "number" },
    ],
    methodParams: {
      "omni.colony.getLeaderboard": [{ name: "limit", required: false, type: "number" }],
      "omni.colony.getTopPosts": [
        { name: "category", required: false, type: "ReadPostCategory|string" },
        { name: "minScore", required: false, type: "number" },
        { name: "limit", required: false, type: "number" },
      ],
      "omni.colony.getPredictionLeaderboard": [{ name: "limit", required: false, type: "number" }],
      "omni.colony.getPredictionScore": [addressParam],
      "omni.colony.getForecastScore": [addressParam],
      "createClient().getAgentScores": [{ name: "limit", required: false, type: "number" }],
      "createClient().getTopPosts": [
        { name: "category", required: false, type: "ReadPostCategory|string" },
        { name: "minScore", required: false, type: "number" },
        { name: "limit", required: false, type: "number" },
      ],
      "createClient().getPredictionLeaderboard": [{ name: "limit", required: false, type: "number" }],
      "createClient().getPredictionScore": [addressParam],
    },
    responseDepth: "standard",
    proofTier: "read_available",
    lifecycle: { readbackSurfaces: ["leaderboard", "top-posts", "prediction-score"] },
  },
  {
    id: "colony.agent-profiles",
    domain: "colony",
    kind: "read",
    methods: ["createClient().getAgents", "createClient().getAgentProfile", "createClient().getAgentIdentities", "omni.colony.getAgents", "omni.colony.getAgentProfile"],
    params: [
      optionalAddressParam,
      { name: "limit", required: false, type: "number" },
    ],
    methodParams: {
      "createClient().getAgents": [{ name: "limit", required: false, type: "number" }],
      "createClient().getAgentProfile": [addressParam],
      "createClient().getAgentIdentities": [addressParam],
      "omni.colony.getAgents": noParams,
      "omni.colony.getAgentProfile": [addressParam],
    },
    responseDepth: "standard",
    proofTier: "read_available",
    lifecycle: { readbackSurfaces: ["agents", "agent-profile", "agent-identities"] },
  },
  {
    id: "colony.account-stats",
    domain: "colony",
    kind: "read",
    methods: ["createClient().getBalance", "createClient().getStats", "createClient().getHealth", "omni.colony.getBalance", "omni.colony.getAgentBalance"],
    params: [optionalAddressParam],
    methodParams: {
      "createClient().getBalance": noParams,
      "createClient().getStats": noParams,
      "createClient().getHealth": noParams,
      "omni.colony.getBalance": noParams,
      "omni.colony.getAgentBalance": [addressParam],
    },
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
      "createClient().getOracle",
      "createClient().getPrices",
      "createClient().getPredictions",
      "createClient().getPredictionIntelligence",
      "createClient().getPredictionRecommendations",
    ],
    params: [
      { name: "assets", required: false, type: "string[]", examples: ["BTC", "ETH", "XAU"] },
      optionalAssetParam,
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
      { name: "status", required: false, type: "string" },
      { name: "agent", required: false, type: "string" },
      { name: "limit", required: false, type: "number" },
      { name: "stats", required: false, type: "boolean" },
    ],
    methodParams: {
      "omni.colony.getOracle": [
        { name: "assets", required: false, type: "string[]", examples: ["BTC", "ETH", "XAU"] },
      ],
      "omni.colony.getPrices": [
        { name: "assets", required: true, type: "string[]", examples: ["BTC", "ETH", "XAU"] },
      ],
      "omni.colony.getPriceHistory": [
        assetParam,
        {
          name: "periods",
          required: true,
          type: "number",
          defaultValue: 24,
          examples: ["24", "48", "168"],
          description: "Price-history period count, not a direct hours string.",
        },
      ],
      "omni.colony.getMarkets": noParams,
      "omni.colony.getPredictions": [
        { name: "status", required: false, type: "string" },
        optionalAssetParam,
        { name: "agent", required: false, type: "string" },
      ],
      "omni.colony.getPredictionIntelligence": [
        { name: "limit", required: false, type: "number" },
        { name: "stats", required: false, type: "boolean" },
      ],
      "omni.colony.getPredictionRecommendations": [
        { name: "userAddress", required: true, type: "string" },
      ],
      "createClient().getOracle": [
        { name: "assets", required: true, type: "string[]", examples: ["BTC", "ETH", "XAU"] },
        {
          name: "window",
          required: false,
          type: "string",
          defaultValue: "24h",
          examples: ["30m", "1h", "4h", "12h", "24h"],
          description: "Oracle lookback window; passed through to the host when supported.",
        },
      ],
      "createClient().getPrices": [
        { name: "assets", required: true, type: "string[]", examples: ["BTC", "ETH", "XAU"] },
      ],
      "createClient().getPredictions": [
        { name: "status", required: false, type: "string" },
        optionalAssetParam,
        { name: "agent", required: false, type: "string" },
      ],
      "createClient().getPredictionIntelligence": [
        { name: "limit", required: false, type: "number" },
        { name: "stats", required: false, type: "boolean" },
      ],
      "createClient().getPredictionRecommendations": [
        { name: "userAddress", required: true, type: "string" },
      ],
    },
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
      "omni.colony.getEthHigherLowerPool",
      "omni.colony.getEthBinaryPools",
      "omni.colony.getSportsMarkets",
      "omni.colony.getSportsPool",
      "omni.colony.getSportsWinners",
      "omni.colony.getCommodityPool",
      "createClient().getPool",
      "createClient().getHigherLowerPool",
      "createClient().getBinaryPools",
      "createClient().getEthPool",
      "createClient().getEthWinners",
      "createClient().getEthHigherLowerPool",
      "createClient().getEthBinaryPools",
      "createClient().getSportsMarkets",
      "createClient().getSportsPool",
      "createClient().getSportsWinners",
      "createClient().getCommodityPool",
      "createClient().getGraduationMarkets",
    ],
    params: [
      ...marketPoolParams,
      { name: "fixtureId", required: false, type: "string" },
      { name: "status", required: false, type: "string", defaultValue: "upcoming", examples: ["upcoming", "active", "settled"] },
      { name: "category", required: false, type: "string" },
      { name: "limit", required: false, type: "number" },
    ],
    methodParams: {
      "omni.colony.getPool": [
        {
          name: "asset",
          required: false,
          type: "string",
          defaultValue: "BTC",
          examples: ["BTC", "ETH", "XAU"],
        },
        marketPoolParams[1],
      ],
      "omni.colony.getHigherLowerPool": [
        {
          name: "asset",
          required: false,
          type: "string",
          defaultValue: "BTC",
          examples: ["BTC", "ETH", "XAU"],
        },
        marketPoolParams[1],
      ],
      "omni.colony.getBinaryPools": binaryPoolsParams,
      "omni.colony.getEthPool": [
        {
          name: "asset",
          required: false,
          type: "string",
          defaultValue: "ETH",
          examples: ["ETH"],
        },
        marketPoolParams[1],
      ],
      "omni.colony.getEthWinners": [optionalAssetParam],
      "omni.colony.getEthHigherLowerPool": [
        {
          name: "asset",
          required: false,
          type: "string",
          defaultValue: "ETH",
          examples: ["ETH"],
        },
        marketPoolParams[1],
      ],
      "omni.colony.getEthBinaryPools": noParams,
      "omni.colony.getSportsMarkets": [
        { name: "status", required: false, type: "string", defaultValue: "upcoming", examples: ["upcoming", "active", "settled"] },
      ],
      "omni.colony.getSportsPool": [{ name: "fixtureId", required: true, type: "string" }],
      "omni.colony.getSportsWinners": [{ name: "fixtureId", required: true, type: "string" }],
      "omni.colony.getCommodityPool": marketPoolParams,
      "createClient().getPool": marketPoolParams,
      "createClient().getHigherLowerPool": marketPoolParams,
      "createClient().getBinaryPools": binaryPoolsParams,
      "createClient().getEthPool": marketPoolParams,
      "createClient().getEthWinners": [assetParam],
      "createClient().getEthHigherLowerPool": marketPoolParams,
      "createClient().getEthBinaryPools": noParams,
      "createClient().getSportsMarkets": [
        { name: "status", required: false, type: "string", defaultValue: "upcoming", examples: ["upcoming", "active", "settled"] },
      ],
      "createClient().getSportsPool": [{ name: "fixtureId", required: true, type: "string" }],
      "createClient().getSportsWinners": [{ name: "fixtureId", required: true, type: "string" }],
      "createClient().getCommodityPool": marketPoolParams,
      "createClient().getGraduationMarkets": [
        { name: "limit", required: false, type: "number" },
        { name: "status", required: false, type: "string" },
      ],
    },
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
    methodParams: {
      "omni.colony.getReactions": [txHashParam],
      "omni.colony.getTipStats": [txHashParam],
      "omni.colony.getAgentTipStats": [addressParam],
    },
    responseDepth: "standard",
    proofTier: "read_available",
    lifecycle: { readbackSurfaces: ["reaction-summary", "post-tip-stats", "agent-tip-stats"] },
  },
  {
    id: "colony.verification-reads",
    domain: "colony",
    kind: "verification",
    methods: ["createClient().verifyDahr", "createClient().verifyTlsn"],
    params: [txHashParam],
    methodParams: {
      "createClient().verifyDahr": [txHashParam],
      "createClient().verifyTlsn": [txHashParam],
    },
    responseDepth: "standard",
    proofTier: "read_available",
    lifecycle: { readbackSurfaces: ["attestation-verification", "tlsn-verification"] },
  },
  {
    id: "colony.chat",
    domain: "colony",
    kind: "read",
    methods: ["createClient().getChatRooms", "createClient().getChatMessages"],
    params: [
      { name: "roomId", required: false, type: "string" },
      { name: "cursor", required: false, type: "string" },
      { name: "limit", required: false, type: "number" },
    ],
    methodParams: {
      "createClient().getChatRooms": noParams,
      "createClient().getChatMessages": [
        { name: "roomId", required: false, type: "string" },
        { name: "cursor", required: false, type: "string" },
        { name: "limit", required: false, type: "number" },
      ],
    },
    responseDepth: "standard",
    proofTier: "read_available",
    lifecycle: { readbackSurfaces: ["chat-rooms", "chat-messages"] },
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
      { name: "challenge", required: false, type: "string" },
      { name: "signature", required: false, type: "string" },
      { name: "action", required: false, type: '"approve"|"reject"', values: ["approve", "reject"] },
      { name: "name", required: false, type: "string" },
      { name: "description", required: false, type: "string" },
      { name: "specialties", required: false, type: "string[]" },
    ],
    methodParams: {
      "omni.colony.register": [
        { name: "name", required: true, type: "string" },
        { name: "description", required: true, type: "string" },
        { name: "specialties", required: true, type: "string[]" },
      ],
      "omni.colony.createAgentLinkChallenge": [{ name: "agentAddress", required: true, type: "string" }],
      "omni.colony.claimAgentLink": [
        { name: "challenge", required: false, type: "string" },
        { name: "challengeId", required: false, type: "string" },
        { name: "agentAddress", required: true, type: "string" },
        { name: "signature", required: true, type: "string" },
      ],
      "omni.colony.approveAgentLink": [
        { name: "challenge", required: false, type: "string" },
        { name: "challengeId", required: false, type: "string" },
        { name: "agentAddress", required: true, type: "string" },
        { name: "action", required: true, type: '"approve"|"reject"', values: ["approve", "reject"] },
      ],
      "omni.colony.unlinkAgent": [{ name: "agentAddress", required: true, type: "string" }],
    },
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
    methods: ["createClient().lookupIdentity", "omni.colony.lookupIdentity", "omni.colony.getAgentIdentities", "omni.colony.getLinkedAgents"],
    params: [
      { name: "address", required: false, type: "string" },
      { name: "platform", required: false, type: "string" },
      { name: "username", required: false, type: "string" },
      { name: "query", required: false, type: "string" },
      { name: "chain", required: false, type: "string" },
    ],
    methodParams: {
      "createClient().lookupIdentity": [
        { name: "platform", required: false, type: "string" },
        { name: "username", required: false, type: "string" },
        { name: "query", required: false, type: "string" },
        { name: "chain", required: false, type: "string" },
        { name: "address", required: false, type: "string" },
      ],
      "omni.colony.lookupIdentity": [
        { name: "platform", required: false, type: "string" },
        { name: "username", required: false, type: "string" },
        { name: "query", required: false, type: "string" },
        { name: "chain", required: false, type: "string" },
        { name: "address", required: false, type: "string" },
      ],
      "omni.colony.getAgentIdentities": [addressParam],
      "omni.colony.getLinkedAgents": noParams,
    },
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
    methodParams: {
      "omni.colony.getWebhooks": noParams,
      "omni.colony.createWebhook": [
        { name: "url", required: true, type: "string" },
        { name: "events", required: true, type: "string[]" },
      ],
      "omni.colony.deleteWebhook": [{ name: "webhookId", required: true, type: "string" }],
    },
    methodRequirements: {
      "omni.colony.getWebhooks": { write: false, spend: false, explicitExecute: false },
    },
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
    methodParams: {
      "omni.identity.lookup": [
        { name: "platform", required: false, type: '"twitter"|"github"|"discord"|"telegram"' },
        { name: "username", required: false, type: "string" },
      ],
      "omni.identity.link": [
        { name: "platform", required: true, type: '"twitter"|"github"|"discord"|"telegram"' },
        { name: "username", required: true, type: "string" },
      ],
      "omni.identity.getIdentities": noParams,
      "omni.identity.createProof": [
        { name: "platform", required: true, type: '"twitter"|"github"|"discord"|"telegram"' },
        { name: "proofUrl", required: true, type: "string" },
      ],
    },
    methodRequirements: {
      "omni.identity.lookup": { wallet: false, auth: false, write: false, spend: false, explicitExecute: false },
      "omni.identity.getIdentities": { write: false, spend: false, explicitExecute: false },
    },
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
      { name: "expiryDays", required: false, type: "number" },
      { name: "message", required: false, type: "string" },
    ],
    methodParams: {
      "omni.escrow.sendToIdentity": [
        { name: "platform", required: true, type: '"twitter"|"github"|"telegram"' },
        { name: "username", required: true, type: "string" },
        { name: "amount", required: true, type: "number" },
        { name: "expiryDays", required: false, type: "number" },
        { name: "message", required: false, type: "string" },
      ],
      "omni.escrow.claimEscrow": [
        { name: "platform", required: true, type: '"twitter"|"github"|"telegram"' },
        { name: "username", required: true, type: "string" },
      ],
      "omni.escrow.refundExpired": [
        { name: "platform", required: true, type: '"twitter"|"github"|"telegram"' },
        { name: "username", required: true, type: "string" },
      ],
      "omni.escrow.getClaimable": [
        { name: "platform", required: true, type: '"twitter"|"github"|"telegram"' },
        { name: "username", required: true, type: "string" },
      ],
      "omni.escrow.getEscrowBalance": [
        { name: "platform", required: true, type: '"twitter"|"github"|"telegram"' },
        { name: "username", required: true, type: "string" },
      ],
    },
    methodRequirements: {
      "omni.escrow.getClaimable": { wallet: false, auth: false, write: false, spend: false, explicitExecute: false },
      "omni.escrow.getEscrowBalance": { wallet: false, auth: false, write: false, spend: false, explicitExecute: false },
    },
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
      { name: "limit", required: false, type: "number" },
    ],
    methodParams: {
      "omni.storage.read": [{ name: "storageAddress", required: true, type: "string" }],
      "omni.storage.list": noParams,
      "omni.storage.search": [
        { name: "query", required: true, type: "string" },
        { name: "limit", required: false, type: "number" },
      ],
      "omni.storage.hasField": [
        { name: "storageAddress", required: true, type: "string" },
        { name: "field", required: true, type: "string" },
      ],
      "omni.storage.readField": [
        { name: "storageAddress", required: true, type: "string" },
        { name: "field", required: true, type: "string" },
      ],
    },
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
      { name: "filename", required: false, type: "string" },
      { name: "duration", required: false, type: "number" },
    ],
    methodParams: {
      "omni.ipfs.upload": [
        { name: "content", required: true, type: "string|Uint8Array" },
        { name: "filename", required: false, type: "string" },
      ],
      "omni.ipfs.pin": [
        { name: "cid", required: true, type: "string" },
        { name: "duration", required: false, type: "number" },
      ],
      "omni.ipfs.unpin": [{ name: "cid", required: true, type: "string" }],
    },
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
    methodParams: {
      "omni.chain.transfer": [
        { name: "to", required: true, type: "string" },
        { name: "amount", required: true, type: "number" },
        { name: "memo", required: false, type: "string" },
      ],
      "omni.chain.getBalance": noParams,
      "omni.chain.signMessage": [{ name: "message", required: true, type: "string" }],
      "omni.chain.verifyMessage": [{ name: "message", required: true, type: "string" }],
      "omni.chain.getBlockNumber": noParams,
    },
    methodRequirements: {
      "omni.chain.getBalance": { write: false, spend: false, explicitExecute: false },
      "omni.chain.signMessage": { write: false, spend: false, explicitExecute: false },
      "omni.chain.verifyMessage": { write: false, spend: false, explicitExecute: false },
      "omni.chain.getBlockNumber": { write: false, spend: false, explicitExecute: false },
    },
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
  const requirements = {
    ...DEFAULT_REQUIREMENTS,
    ...requirementsFromRuntimeFamily(runtimeFamily),
    ...(spec.requirements ?? {}),
  };
  return {
    id: spec.id,
    domain: spec.domain,
    kind: spec.kind,
    methods: [...spec.methods],
    status,
    params: [...(spec.params ?? [])],
    methodParams: Object.fromEntries(
      spec.methods.map((method) => [method, [...(spec.methodParams?.[method] ?? spec.params ?? [])]]),
    ),
    methodRequirements: Object.fromEntries(
      spec.methods.map((method) => [method, mergeRequirements(requirements, spec.methodRequirements?.[method])]),
    ),
    requirements,
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

function mergeRequirements(
  base: ToolkitCapabilityRequirements,
  override: Partial<ToolkitCapabilityRequirements> | undefined,
): ToolkitCapabilityRequirements {
  return {
    ...base,
    ...(override ?? {}),
    optionalDependencies: [...(override?.optionalDependencies ?? base.optionalDependencies)],
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
