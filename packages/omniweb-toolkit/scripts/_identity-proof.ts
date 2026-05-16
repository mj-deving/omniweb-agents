import { execFileSync } from "node:child_process";

export const IDENTITY_PROOF_PHASES = ["register", "human-link", "cleanup", "full"] as const;

export type IdentityProofPhase = typeof IDENTITY_PROOF_PHASES[number];

export function isIdentityProofPhase(value: string): value is IdentityProofPhase {
  return (IDENTITY_PROOF_PHASES as readonly string[]).includes(value);
}

export function isOkApiResult(result: unknown): result is { ok: true; status?: number; data: Record<string, unknown> } {
  return !!result && typeof result === "object" && (result as { ok?: unknown }).ok === true;
}

export function summarizeMutationResult(result: unknown, success: string): Record<string, unknown> {
  if (isOkApiResult(result)) {
    return {
      ok: true,
      status: typeof result.status === "number" ? result.status : null,
      detail: success,
    };
  }

  return {
    ok: false,
    status: typeof (result as { status?: unknown } | null)?.status === "number" ? (result as { status: number }).status : null,
    detail: typeof (result as { error?: unknown } | null)?.error === "string" ? String((result as { error: string }).error).slice(0, 200) : "not attempted or unknown error",
  };
}

export function summarizeChallenge(result: unknown): Record<string, unknown> {
  if (!isOkApiResult(result)) {
    return summarizeMutationResult(result, "challenge created");
  }
  return {
    ok: true,
    status: typeof result.status === "number" ? result.status : null,
    hasChallengeHandle: typeof result.data.challenge === "string" || typeof result.data.nonce === "string" || typeof result.data.challengeId === "string",
    hasMessage: typeof result.data.message === "string" && result.data.message.length > 0,
    humanAddress: typeof result.data.humanAddress === "string" ? result.data.humanAddress : null,
    expiresAt: result.data.expiresAt ?? null,
    redacted: ["challenge", "challengeId", "nonce", "message"],
  };
}

export function summarizeAgentProfile(result: unknown, agentAddress: string): Record<string, unknown> {
  if (!isOkApiResult(result)) {
    return summarizeMutationResult(result, "agent profile read back");
  }
  return {
    ok: true,
    status: typeof result.status === "number" ? result.status : null,
    matchesAddress: normalizeAddress(result.data.address) === normalizeAddress(agentAddress),
    address: typeof result.data.address === "string" ? result.data.address : null,
    name: typeof result.data.name === "string" ? result.data.name : typeof result.data.displayName === "string" ? result.data.displayName : null,
    description: typeof result.data.description === "string" ? result.data.description : null,
    specialties: Array.isArray(result.data.specialties) ? result.data.specialties : [],
    registeredAt: result.data.registeredAt ?? null,
    lastSeen: result.data.lastSeen ?? null,
  };
}

export function summarizeLinkedAgents(result: unknown, agentAddress: string): Record<string, unknown> {
  if (!isOkApiResult(result) || !Array.isArray(result.data.agents)) {
    return summarizeMutationResult(result, "linked agents read back");
  }
  const agents = result.data.agents.map((agent) => {
    const record = agent as Record<string, unknown>;
    return {
      address: typeof record.address === "string" ? record.address : typeof record.agentAddress === "string" ? record.agentAddress : null,
      name: typeof record.name === "string" ? record.name : null,
      relationship: typeof record.relationship === "string" ? record.relationship : null,
      status: typeof record.status === "string" ? record.status : null,
      linkedAt: record.linkedAt ?? null,
    };
  });
  return {
    ok: true,
    status: typeof result.status === "number" ? result.status : null,
    count: agents.length,
    containsAgent: agents.some((agent) => normalizeAddress(agent.address) === normalizeAddress(agentAddress)),
    agents,
  };
}

export function profileMatches(result: unknown, agentAddress: string, expectedName: string): boolean {
  if (!isOkApiResult(result)) return false;
  return normalizeAddress(result.data.address) === normalizeAddress(agentAddress)
    && (result.data.name === expectedName || result.data.displayName === expectedName);
}

export function linkedContains(result: unknown, agentAddress: string): boolean {
  if (!isOkApiResult(result) || !Array.isArray(result.data.agents)) return false;
  return result.data.agents.some((agent) => {
    const record = agent as Record<string, unknown>;
    return normalizeAddress(record.address) === normalizeAddress(agentAddress)
      || normalizeAddress(record.agentAddress) === normalizeAddress(agentAddress);
  });
}

export function shortCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function normalizeAddress(address: unknown): string | null {
  return typeof address === "string" ? address.toLowerCase() : null;
}
