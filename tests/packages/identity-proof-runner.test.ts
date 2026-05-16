import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  linkedContains,
  profileMatches,
  summarizeAgentProfile,
  summarizeChallenge,
  summarizeLinkedAgents,
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
});
