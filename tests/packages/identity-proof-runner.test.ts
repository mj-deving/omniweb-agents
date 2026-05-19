import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  extractSignatureValue,
  linkedContains,
  profileMatches,
  redactIdentityProbeCommand,
  shouldRunCleanupPhase,
  summarizeAgentProfile,
  summarizeChallenge,
  summarizeIdentityProbeRuntimeTarget,
  summarizeLinkedAgents,
  summarizeSignResult,
} from "../../packages/omniweb-toolkit/scripts/_identity-proof.js";

describe("identity proof runner safety", () => {
  it("fails live execution before runtime loading unless identity mutation is confirmed", () => {
    const result = spawnSync(
      "node",
      ["--import", "tsx", "packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts", "--execute", "--phase", "register"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--confirm-identity-mutation");
    expect(result.stdout).toBe("");
  });

  it("rejects unknown identity proof phases", () => {
    const result = spawnSync(
      "node",
      ["--import", "tsx", "packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts", "--phase", "surprise"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--phase must be one of");
  });

  it("requires values for explicit wallet targeting flags before runtime loading", () => {
    const envPath = spawnSync(
      "node",
      ["--import", "tsx", "packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts", "--env-path"],
      { encoding: "utf8" },
    );
    const agentName = spawnSync(
      "node",
      ["--import", "tsx", "packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts", "--agent-name"],
      { encoding: "utf8" },
    );

    expect(envPath.status).toBe(2);
    expect(envPath.stderr).toContain("--env-path requires a value");
    expect(agentName.status).toBe(2);
    expect(agentName.stderr).toContain("--agent-name requires a value");
  });

  it("rejects option-looking wallet target values before live execution", () => {
    const result = spawnSync(
      "node",
      [
        "--import",
        "tsx",
        "packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts",
        "--env-path",
        "--execute",
        "--confirm-identity-mutation",
      ],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--env-path requires a value");
    expect(result.stdout).toBe("");
  });

  it("redacts local credential and proof paths while preserving target source markers", () => {
    const summary = summarizeIdentityProbeRuntimeTarget({
      envPath: "EXAMPLE_PRIVATE_ENV_FILE",
      agentName: "throwaway-proof-agent",
      stateDir: "EXAMPLE_STATE_DIR",
    });
    const command = redactIdentityProbeCommand([
      "node",
      "probe-identity-surfaces.ts",
      "--env-path",
      "EXAMPLE_PRIVATE_ENV_FILE",
      "--agent-name",
      "throwaway-proof-agent",
      "--state-dir",
      "EXAMPLE_STATE_DIR",
      "--proof-out",
      "EXAMPLE_PROOF_OUTPUT",
    ]);

    expect(summary).toEqual({
      credentialSource: "explicit-env-path",
      envPath: "provided-redacted",
      agentName: "throwaway-proof-agent",
      stateDir: "provided-redacted",
    });
    expect(command).toContain("--env-path <redacted-env-path>");
    expect(command).toContain("--state-dir <redacted-state-dir>");
    expect(command).toContain("--proof-out <redacted-proof-out>");
    expect(command).toContain("--agent-name throwaway-proof-agent");
    expect(command).not.toContain("EXAMPLE_PRIVATE_ENV_FILE");
    expect(command).not.toContain("EXAMPLE_STATE_DIR");
    expect(command).not.toContain("EXAMPLE_PROOF_OUTPUT");
  });

  it("redacts challenge handles, signatures, and messages from challenge summaries", () => {
    const summary = summarizeChallenge({
      ok: true,
      status: 200,
      data: {
        challenge: "secret-challenge",
        challengeId: "secret-id",
        nonce: "secret-nonce",
        message: "sign this secret text",
        humanAddress: "0xHuman",
        expiresAt: "2026-05-16T22:00:00Z",
      },
    });

    expect(summary).toMatchObject({
      ok: true,
      hasChallengeHandle: true,
      hasMessage: true,
      humanAddress: "0xHuman",
      redacted: ["challenge", "challengeId", "nonce", "message"],
    });
    expect(JSON.stringify(summary)).not.toContain("secret-challenge");
    expect(JSON.stringify(summary)).not.toContain("secret-id");
    expect(JSON.stringify(summary)).not.toContain("secret-nonce");
    expect(JSON.stringify(summary)).not.toContain("sign this secret text");
  });

  it("keeps linked-agent and profile readback public and matchable", () => {
    const address = "0xABC";
    const profile = {
      ok: true,
      status: 200,
      data: {
        address: "0xabc",
        displayName: "proof-agent",
        description: "public profile",
        specialties: ["testing"],
        authToken: "should-not-appear",
      },
    };
    const linked = {
      ok: true,
      status: 200,
      data: {
        agents: [
          {
            agentAddress: "0xabc",
            name: "proof-agent",
            relationship: "owner",
            challengeSecret: "should-not-appear",
          },
        ],
      },
    };

    expect(profileMatches(profile, address, "proof-agent")).toBe(true);
    expect(linkedContains(linked, address)).toBe(true);
    expect(summarizeAgentProfile(profile, address)).toMatchObject({
      ok: true,
      matchesAddress: true,
      address: "0xabc",
      name: "proof-agent",
    });
    const linkedSummary = summarizeLinkedAgents(linked, address);
    expect(linkedSummary).toMatchObject({
      ok: true,
      containsAgent: true,
      count: 1,
    });
    expect(JSON.stringify(linkedSummary)).not.toContain("should-not-appear");
  });

  it("derives signature summary from the actual parsed signature value", () => {
    const nestedSignature = { ok: true, signature: { data: "secret-signature" } };
    const missingSignature = { ok: true, signature: { data: 123 } };

    expect(extractSignatureValue(nestedSignature)).toBe("secret-signature");
    expect(summarizeSignResult(nestedSignature, extractSignatureValue(nestedSignature))).toMatchObject({
      ok: true,
      hasSignature: true,
      redacted: true,
    });
    expect(extractSignatureValue(missingSignature)).toBeNull();
    expect(summarizeSignResult(missingSignature, extractSignatureValue(missingSignature))).toMatchObject({
      ok: true,
      hasSignature: false,
      redacted: true,
    });
  });

  it("only allows full-phase cleanup after the link flow succeeded", () => {
    expect(shouldRunCleanupPhase("full", false)).toBe(false);
    expect(shouldRunCleanupPhase("full", true)).toBe(true);
    expect(shouldRunCleanupPhase("cleanup", false)).toBe(true);
    expect(shouldRunCleanupPhase("human-link", true)).toBe(false);
  });
});
