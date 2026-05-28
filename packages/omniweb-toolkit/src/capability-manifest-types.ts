import type { RuntimeActionFamily, RuntimeCapabilityResult, WriteReadinessOptions } from "./readiness.js";

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

export interface StaticCapabilitySpec {
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

export type StatusPolicy =
  | "always-available"
  | "runtime-action"
  | "wallet-write"
  | "supervised-identity"
  | "advanced-runtime"
  | "manual-recovery"
  | "always-blocked"
  | "pending-current-recheck"
  | "degraded-read"
  | "experimental-runtime";
