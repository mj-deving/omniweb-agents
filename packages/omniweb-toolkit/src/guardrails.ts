import { sanitizeUrl } from "../../../src/toolkit/sdk-bridge.js";
import { validateUrl, type UrlValidationOptions, type UrlValidationResult } from "./url-validator.js";
import type { ToolkitCapabilityManifest } from "./capability-manifest.js";
import type { ColonyOperatorActionFamily, ColonyOperatorActionTruth } from "./colony-operator-capability-truth.js";
import type { ColonyOperatorExecutionMode, ColonyOperatorRequestedAction } from "./colony-operator-entrypoint.js";
import type { ResolvedIntent } from "./intent-types.js";
import type { RuntimeCapabilityResult } from "./readiness.js";

export type ToolkitGuardrailDomain =
  | "untrusted_content"
  | "url_ssrf"
  | "credential_secret_redaction"
  | "auth_token_lifecycle"
  | "write_spend_authorization"
  | "identity_supervision"
  | "webhook_inbound_safety"
  | "evidence_provenance_attestation_url";

export type ToolkitGuardrailSeverity = "info" | "warning" | "error" | "critical";

export type ToolkitGuardrailStatus =
  | "pass"
  | "block"
  | "supervised"
  | "degraded"
  | "not_applicable";

export interface ToolkitGuardrailManifestEntry {
  domain: ToolkitGuardrailDomain;
  label: string;
  defaultStatus: ToolkitGuardrailStatus;
  enforcedBy: Array<"toolkit-runtime" | "validateUrl" | "sanitizeUrl" | "capability-manifest" | "operator-envelope">;
  protects: string[];
}

export interface ToolkitGuardrailManifest {
  generatedAt: string;
  source: "omniweb-toolkit";
  authority: "toolkit-runtime";
  statusVocabulary: ToolkitGuardrailStatus[];
  severityVocabulary: ToolkitGuardrailSeverity[];
  domains: ToolkitGuardrailManifestEntry[];
  runtimeTruth: {
    capabilityManifestField: "toolkitCapabilityManifest";
    actionTruthField: "capabilityTruth.actions";
    executionEnvelopeField: "guardrailEvaluation";
  };
  coverage: {
    totalDomains: number;
    blockingDomains: ToolkitGuardrailDomain[];
    supervisedDomains: ToolkitGuardrailDomain[];
    degradedDomains: ToolkitGuardrailDomain[];
  };
}

export interface ToolkitGuardrailFinding {
  code: string;
  domain: ToolkitGuardrailDomain;
  severity: ToolkitGuardrailSeverity;
  status: ToolkitGuardrailStatus;
  message: string;
  source?: string;
  evidence?: string;
  sanitizedValue?: string;
}

export interface ToolkitGuardrailEvaluationReport {
  generatedAt: string;
  source: "omniweb-toolkit";
  authority: "toolkit-runtime";
  status: ToolkitGuardrailStatus;
  actionFamily: string | null;
  actionType: string | null;
  findings: ToolkitGuardrailFinding[];
  blockedReasonCodes: string[];
  supervisedRequirements: string[];
  degradedReasonCodes: string[];
  untrustedInputs: Array<{
    kind: ToolkitGuardrailUntrustedInput["kind"];
    source: string;
    quotedEvidence: string;
  }>;
}

export interface ToolkitGuardrailUntrustedInput {
  kind: "colony_post" | "reply" | "feed_item" | "webhook_payload" | "source_text" | "operator_request";
  source?: string;
  text: string;
}

export interface ToolkitGuardrailEvaluationInput {
  now?: Date;
  mode?: ColonyOperatorExecutionMode;
  explicitExecute?: boolean;
  actionFamily?: ColonyOperatorActionFamily | string;
  actionTruth?: ColonyOperatorActionTruth;
  requestedAction?: ColonyOperatorRequestedAction;
  resolution?: ResolvedIntent;
  runtimeCapabilities?: RuntimeCapabilityResult;
  toolkitCapabilityManifest?: ToolkitCapabilityManifest;
  untrustedInputs?: ToolkitGuardrailUntrustedInput[];
  webhookPayload?: unknown;
  urls?: string[];
  allowInsecureUrls?: boolean;
  urlValidationOptions?: Omit<UrlValidationOptions, "allowInsecure">;
  validateUrlFn?: (url: string, opts?: UrlValidationOptions) => Promise<UrlValidationResult>;
}

const GUARDRAIL_STATUS_VOCABULARY: ToolkitGuardrailStatus[] = [
  "pass",
  "block",
  "supervised",
  "degraded",
  "not_applicable",
];

const GUARDRAIL_SEVERITY_VOCABULARY: ToolkitGuardrailSeverity[] = [
  "info",
  "warning",
  "error",
  "critical",
];

const GUARDRAIL_DOMAINS: ToolkitGuardrailManifestEntry[] = [
  {
    domain: "untrusted_content",
    label: "Untrusted colony content and prompt-injection isolation",
    defaultStatus: "block",
    enforcedBy: ["toolkit-runtime", "operator-envelope"],
    protects: ["feed posts", "thread replies", "source text", "operator control flow"],
  },
  {
    domain: "url_ssrf",
    label: "URL and SSRF safety",
    defaultStatus: "block",
    enforcedBy: ["validateUrl", "sanitizeUrl", "toolkit-runtime"],
    protects: ["attestation URLs", "publish proof URLs", "webhook URLs"],
  },
  {
    domain: "credential_secret_redaction",
    label: "Credential and secret redaction",
    defaultStatus: "block",
    enforcedBy: ["sanitizeUrl", "toolkit-runtime"],
    protects: ["findings", "errors", "operator envelopes"],
  },
  {
    domain: "auth_token_lifecycle",
    label: "Auth token lifecycle",
    defaultStatus: "degraded",
    enforcedBy: ["capability-manifest", "toolkit-runtime"],
    protects: ["wallet-backed writes", "authenticated reads", "session refresh"],
  },
  {
    domain: "write_spend_authorization",
    label: "Write and spend authorization",
    defaultStatus: "block",
    enforcedBy: ["capability-manifest", "operator-envelope"],
    protects: ["publish", "reply", "tip", "bet", "attestation", "vote"],
  },
  {
    domain: "identity_supervision",
    label: "Identity supervision",
    defaultStatus: "supervised",
    enforcedBy: ["capability-manifest", "operator-envelope"],
    protects: ["registration", "human linking", "unlinking"],
  },
  {
    domain: "webhook_inbound_safety",
    label: "Webhook inbound safety",
    defaultStatus: "block",
    enforcedBy: ["toolkit-runtime", "operator-envelope"],
    protects: ["incoming payloads", "schema boundaries", "control flow"],
  },
  {
    domain: "evidence_provenance_attestation_url",
    label: "Evidence provenance and attestation URL safety",
    defaultStatus: "block",
    enforcedBy: ["validateUrl", "operator-envelope"],
    protects: ["DAHR/TLSN inputs", "publish evidence", "reply evidence"],
  },
];

const PROMPT_INJECTION_RE = /\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|system|developer)\s+instructions\b|system\s+prompt|developer\s+message|use\s+this\s+private\s+key|post\s+this\s+url|publish\s+this\s+url|send\s+funds|transfer\s+\d+(?:\.\d+)?\s*(?:dem|demos)?/i;
const SECRET_RE = /\b(?:mnemonic|seed phrase|private key|approvalToken|challengeSecret)\b|bearer\s+[A-Za-z0-9._~+/=-]+/i;
const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const SENSITIVE_QUERY_RE = /([?&][^=]*(?:api[_-]?key|token|secret|signature|mnemonic|private[_-]?key|bearer|password|auth)[^=]*=)([^&\s]+)/gi;

export function buildToolkitGuardrailManifest(opts: { now?: Date } = {}): ToolkitGuardrailManifest {
  return {
    generatedAt: (opts.now ?? new Date()).toISOString(),
    source: "omniweb-toolkit",
    authority: "toolkit-runtime",
    statusVocabulary: [...GUARDRAIL_STATUS_VOCABULARY],
    severityVocabulary: [...GUARDRAIL_SEVERITY_VOCABULARY],
    domains: GUARDRAIL_DOMAINS.map((entry) => ({
      ...entry,
      enforcedBy: [...entry.enforcedBy],
      protects: [...entry.protects],
    })),
    runtimeTruth: {
      capabilityManifestField: "toolkitCapabilityManifest",
      actionTruthField: "capabilityTruth.actions",
      executionEnvelopeField: "guardrailEvaluation",
    },
    coverage: {
      totalDomains: GUARDRAIL_DOMAINS.length,
      blockingDomains: GUARDRAIL_DOMAINS
        .filter((entry) => entry.defaultStatus === "block")
        .map((entry) => entry.domain),
      supervisedDomains: GUARDRAIL_DOMAINS
        .filter((entry) => entry.defaultStatus === "supervised")
        .map((entry) => entry.domain),
      degradedDomains: GUARDRAIL_DOMAINS
        .filter((entry) => entry.defaultStatus === "degraded")
        .map((entry) => entry.domain),
    },
  };
}

export function evaluateToolkitGuardrailsSync(
  input: ToolkitGuardrailEvaluationInput = {},
): ToolkitGuardrailEvaluationReport {
  return finalizeEvaluation(input, collectBaseFindings(input));
}

export async function evaluateToolkitGuardrails(
  input: ToolkitGuardrailEvaluationInput = {},
): Promise<ToolkitGuardrailEvaluationReport> {
  const findings = collectBaseFindings(input);
  const validate = input.validateUrlFn ?? validateUrl;
  for (const url of collectUrls(input)) {
    const alreadyBlocked = findings.some((finding) => (
      finding.domain === "url_ssrf" && finding.sanitizedValue === sanitizeUrl(url) && finding.status === "block"
    ));
    if (alreadyBlocked) continue;
    const result = await validate(url, {
      allowInsecure: input.allowInsecureUrls,
      ...input.urlValidationOptions,
    });
    if (!result.valid) {
      findings.push({
        code: "url_validation_failed",
        domain: "url_ssrf",
        severity: "critical",
        status: "block",
        message: `URL failed runtime validation: ${redactSecrets(result.reason ?? "invalid URL")}`,
        sanitizedValue: sanitizeUrl(url),
      });
    }
  }
  return finalizeEvaluation(input, findings);
}

function collectBaseFindings(input: ToolkitGuardrailEvaluationInput): ToolkitGuardrailFinding[] {
  const findings: ToolkitGuardrailFinding[] = [];
  const actionFamily = input.actionFamily ?? input.actionTruth?.actionFamily;
  const actionStatus = input.actionTruth?.status ?? input.resolution?.status;
  const explicitExecute = input.explicitExecute === true || input.mode === "execute";
  const spendsDem = input.actionTruth?.spendsDem === true || actionSpendsDem(input.resolution?.actionType);
  const requiresWrite = input.actionTruth?.requiresWallet === true
    || input.resolution?.capability?.requiresWallet === true
    || spendsDem;

  for (const item of collectUntrustedInputs(input)) {
    const sanitized = redactSecrets(item.text);
    if (PROMPT_INJECTION_RE.test(item.text)) {
      findings.push({
        code: "untrusted_instruction_detected",
        domain: "untrusted_content",
        severity: "critical",
        status: "block",
        message: "Untrusted colony or source content contains instruction-like text and cannot affect control flow.",
        source: item.source ?? item.kind,
        evidence: quoteEvidence(sanitized),
      });
    }
    if (SECRET_RE.test(item.text) || SENSITIVE_QUERY_RE.test(item.text)) {
      findings.push({
        code: "secret_like_content_redacted",
        domain: "credential_secret_redaction",
        severity: "error",
        status: "block",
        message: "Secret-like content was detected and redacted from the guardrail report.",
        source: item.source ?? item.kind,
        evidence: quoteEvidence(sanitized),
      });
    }
  }

  for (const url of collectUrls(input)) {
    const structural = evaluateUrlStructure(url, input.allowInsecureUrls === true);
    if (structural) {
      findings.push(structural);
    }
    if (SECRET_RE.test(url) || SENSITIVE_QUERY_RE.test(url)) {
      findings.push({
        code: "secret_like_url_redacted",
        domain: "credential_secret_redaction",
        severity: "warning",
        status: "degraded",
        message: "URL contained secret-like material; report stores only the sanitized URL.",
        sanitizedValue: sanitizeUrl(url),
      });
    }
  }

  if (requiresWrite && input.runtimeCapabilities?.authReady === false) {
    findings.push({
      code: "auth_not_ready",
      domain: "auth_token_lifecycle",
      severity: "error",
      status: "block",
      message: "Runtime auth is not ready for a wallet-backed action.",
    });
  }

  if (requiresWrite && input.runtimeCapabilities?.writeReady === false) {
    findings.push({
      code: "write_runtime_not_ready",
      domain: "auth_token_lifecycle",
      severity: "error",
      status: "block",
      message: "Runtime write substrate is not ready for a wallet-backed action.",
    });
  }

  if (actionStatus === "blocked") {
    findings.push({
      code: "capability_truth_blocked",
      domain: "write_spend_authorization",
      severity: "error",
      status: "block",
      message: "Capability truth marks this action blocked.",
      evidence: input.actionTruth?.reasonCodes.map(redactSecrets).join(", "),
    });
  }

  if (actionStatus === "lifecycle-pending" || actionStatus === "degraded") {
    findings.push({
      code: `capability_truth_${String(actionStatus).replace("-", "_")}`,
      domain: "auth_token_lifecycle",
      severity: "warning",
      status: "degraded",
      message: `Capability truth marks this action ${actionStatus}.`,
      evidence: input.actionTruth?.reasonCodes.map(redactSecrets).join(", "),
    });
  }

  if (spendsDem && !explicitExecute) {
    findings.push({
      code: "explicit_execute_required_for_spend",
      domain: "write_spend_authorization",
      severity: "critical",
      status: "block",
      message: "Spend-bearing action is blocked until explicit execute authorization is present.",
    });
  }

  const identityMutation = actionFamily === "register"
    || actionFamily === "human-link"
    || input.actionTruth?.executionPathFamily === "identity_mutation";

  if (input.actionTruth?.requiresExplicitExecute === true && !explicitExecute && input.actionTruth.spendsDem !== true && !identityMutation) {
    findings.push({
      code: "explicit_execute_required_for_write",
      domain: "write_spend_authorization",
      severity: "error",
      status: "block",
      message: "Write action is blocked until explicit execute authorization is present.",
    });
  }

  if (identityMutation) {
    findings.push({
      code: "identity_mutation_requires_supervision",
      domain: "identity_supervision",
      severity: "warning",
      status: "supervised",
      message: "Identity registration and linking require supervised operator authorization.",
    });
  }

  if (input.webhookPayload !== undefined) {
    const webhookText = stringifyUnknown(input.webhookPayload);
    findings.push({
      code: "webhook_payload_untrusted",
      domain: "webhook_inbound_safety",
      severity: "info",
      status: "degraded",
      message: "Inbound webhook payload is classified as untrusted input.",
      evidence: quoteEvidence(redactSecrets(webhookText)),
    });
    if (!isWebhookSchemaLike(input.webhookPayload)) {
      findings.push({
        code: "webhook_payload_schema_invalid",
        domain: "webhook_inbound_safety",
        severity: "error",
        status: "block",
        message: "Inbound webhook payload failed the minimal event schema check.",
      });
    }
  }

  if ((input.resolution?.actionType === "publish" || input.resolution?.actionType === "reply")
    && !input.resolution.normalizedDraft.attestUrl) {
    findings.push({
      code: "missing_attestation_url",
      domain: "evidence_provenance_attestation_url",
      severity: "critical",
      status: "block",
      message: "Publish and reply actions require an attestation URL before execution.",
    });
  }

  return findings;
}

function finalizeEvaluation(
  input: ToolkitGuardrailEvaluationInput,
  findings: ToolkitGuardrailFinding[],
): ToolkitGuardrailEvaluationReport {
  const normalizedFindings = findings.map((finding) => ({
    ...finding,
    message: redactSecrets(finding.message),
    evidence: finding.evidence ? redactSecrets(finding.evidence) : undefined,
    sanitizedValue: finding.sanitizedValue ? sanitizeUrl(finding.sanitizedValue) : undefined,
  }));
  const status = overallStatus(normalizedFindings, input);
  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    source: "omniweb-toolkit",
    authority: "toolkit-runtime",
    status,
    actionFamily: String(input.actionFamily ?? input.actionTruth?.actionFamily ?? input.requestedAction?.actionFamily ?? input.resolution?.actionType ?? "") || null,
    actionType: input.resolution?.actionType ?? input.actionTruth?.intent.actionType ?? null,
    findings: normalizedFindings,
    blockedReasonCodes: normalizedFindings
      .filter((finding) => finding.status === "block")
      .map((finding) => finding.code),
    supervisedRequirements: normalizedFindings
      .filter((finding) => finding.status === "supervised")
      .map((finding) => finding.code),
    degradedReasonCodes: normalizedFindings
      .filter((finding) => finding.status === "degraded")
      .map((finding) => finding.code),
    untrustedInputs: collectUntrustedInputs(input).map((item) => ({
      kind: item.kind,
      source: item.source ?? item.kind,
      quotedEvidence: quoteEvidence(redactSecrets(item.text)),
    })),
  };
}

function overallStatus(
  findings: ToolkitGuardrailFinding[],
  input: ToolkitGuardrailEvaluationInput,
): ToolkitGuardrailStatus {
  if (findings.some((finding) => finding.status === "block")) return "block";
  if (findings.some((finding) => finding.status === "supervised")) return "supervised";
  if (findings.some((finding) => finding.status === "degraded")) return "degraded";
  if (
    input.actionFamily
    || input.actionTruth
    || input.requestedAction
    || input.resolution
    || input.untrustedInputs?.length
    || input.webhookPayload !== undefined
    || input.urls?.length
  ) {
    return "pass";
  }
  return "not_applicable";
}

function collectUntrustedInputs(input: ToolkitGuardrailEvaluationInput): ToolkitGuardrailUntrustedInput[] {
  const items = [...(input.untrustedInputs ?? [])];
  if (input.webhookPayload !== undefined) {
    items.push({
      kind: "webhook_payload",
      source: "webhook_payload",
      text: stringifyUnknown(input.webhookPayload),
    });
  }
  if (input.requestedAction?.params) {
    items.push({
      kind: "operator_request",
      source: `${input.requestedAction.actionFamily}.params`,
      text: stringifyUnknown(input.requestedAction.params),
    });
  }
  if (input.resolution?.normalizedDraft.text) {
    items.push({
      kind: "operator_request",
      source: `${input.resolution.actionType}.draft.text`,
      text: input.resolution.normalizedDraft.text,
    });
  }
  return items;
}

function collectUrls(input: ToolkitGuardrailEvaluationInput): string[] {
  const urls = new Set<string>();
  for (const url of input.urls ?? []) {
    if (url) urls.add(url);
  }
  const primary = input.resolution?.evidencePlan?.primary ?? input.resolution?.normalizedDraft.attestUrl;
  if (primary) urls.add(primary);
  for (const supporting of input.resolution?.evidencePlan?.supporting ?? []) {
    urls.add(supporting);
  }
  for (const item of collectUntrustedInputs(input)) {
    for (const url of item.text.match(URL_RE) ?? []) {
      urls.add(url);
    }
  }
  return [...urls];
}

function evaluateUrlStructure(url: string, allowInsecure: boolean): ToolkitGuardrailFinding | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      code: "invalid_url",
      domain: "url_ssrf",
      severity: "critical",
      status: "block",
      message: "URL is invalid.",
      sanitizedValue: sanitizeUrl(url),
    };
  }
  if (!allowInsecure && parsed.protocol !== "https:") {
    return {
      code: "url_must_use_https",
      domain: "url_ssrf",
      severity: "critical",
      status: "block",
      message: "URL must use HTTPS unless insecure URLs are explicitly allowed for local development.",
      sanitizedValue: sanitizeUrl(url),
    };
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) {
    return blockedUrlFinding(url, "localhost_url_blocked", "localhost hostnames are blocked.");
  }
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd")) {
    return blockedUrlFinding(url, "private_ipv6_url_blocked", "private or loopback IPv6 URLs are blocked.");
  }
  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (
      a === 0
      || a === 10
      || a === 127
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19))
      || a >= 240
    ) {
      return blockedUrlFinding(url, "private_ipv4_url_blocked", "private, metadata, loopback, or reserved IPv4 URLs are blocked.");
    }
  }
  return null;
}

function blockedUrlFinding(url: string, code: string, message: string): ToolkitGuardrailFinding {
  return {
    code,
    domain: "url_ssrf",
    severity: "critical",
    status: "block",
    message,
    sanitizedValue: sanitizeUrl(url),
  };
}

function actionSpendsDem(actionType: string | undefined): boolean {
  return actionType === "publish" || actionType === "reply" || actionType === "tip" || actionType === "bet";
}

function isWebhookSchemaLike(value: unknown): boolean {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && typeof (value as { event?: unknown }).event === "string",
  );
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function quoteEvidence(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 240 ? `${trimmed.slice(0, 237)}...` : trimmed;
}

function redactSecrets(value: string): string {
  return value
    .replace(URL_RE, (url) => sanitizeUrl(url))
    .replace(SENSITIVE_QUERY_RE, "$1REDACTED")
    .replace(/bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer REDACTED")
    .replace(/\b(?:mnemonic|seed phrase|private key)\s*[:=]\s*[^,;\n}]+/gi, (match) => {
      const label = match.split(/[:=]/)[0]?.trim() ?? "secret";
      return `${label}=REDACTED`;
    })
    .replace(/\b(?:approvalToken|challengeSecret)\s*["']?\s*[:=]\s*["']?[^"',;\n}]+/gi, (match) => {
      const label = match.split(/[:=]/)[0]?.replace(/["'\s]/g, "") || "secret";
      return `${label}=REDACTED`;
    });
}
