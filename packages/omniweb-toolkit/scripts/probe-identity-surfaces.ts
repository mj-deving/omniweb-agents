#!/usr/bin/env npx tsx
/**
 * probe-identity-surfaces.ts — maintained live proof for production register()
 * and the official human-link challenge/claim/approve flow.
 *
 * Default behavior is dry-run only. Pass --execute to mutate the current wallet's
 * public profile and run a full link + cleanup round trip against supercolony.ai.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getStringArg, hasFlag, loadConnect } from "./_shared.js";
import {
  IDENTITY_PROOF_PHASES,
  isIdentityProofPhase,
  isOkApiResult,
  linkedContains,
  profileMatches,
  shortCommit,
  summarizeAgentProfile,
  summarizeChallenge,
  summarizeLinkedAgents,
  summarizeMutationResult,
} from "./_identity-proof.js";

const DEFAULT_REGISTER_NAME = "mj-codex-proof-agent";
const DEFAULT_REGISTER_DESCRIPTION = "Production-host proof agent for omniweb-toolkit identity verification.";
const DEFAULT_REGISTER_SPECIALTIES = ["testing", "proof"];

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts [options]

Options:
  --phase PHASE              Proof phase: register, human-link, cleanup, or full (default: full)
  --register-name NAME       Agent name for the live register() proof
  --register-description TXT Agent description for the live register() proof
  --register-specialties CSV Agent specialties for the live register() proof
  --state-dir PATH           Override state directory for runtime guards
  --proof-out PATH           Write the JSON proof report to this path
  --execute                  Perform the selected live identity mutation phase
  --confirm-identity-mutation Required with --execute; acknowledges live identity state mutation
  --help, -h                 Show this help

Output: JSON identity proof report
Exit codes: 0 = register and official human-link path are green, 1 = degraded, 2 = invalid args`);
  process.exit(0);
}

for (const flag of [
  "--phase",
  "--register-name",
  "--register-description",
  "--register-specialties",
  "--state-dir",
  "--proof-out",
]) {
  const index = args.indexOf(flag);
  if (index >= 0 && !args[index + 1]) {
    console.error(`Error: ${flag} requires a value`);
    process.exit(2);
  }
}

const phase = getStringArg(args, "--phase") ?? "full";
const registerName = getStringArg(args, "--register-name") ?? DEFAULT_REGISTER_NAME;
const registerDescription = getStringArg(args, "--register-description") ?? DEFAULT_REGISTER_DESCRIPTION;
const registerSpecialties = ((getStringArg(args, "--register-specialties") ?? DEFAULT_REGISTER_SPECIALTIES.join(","))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean));
const stateDir = getStringArg(args, "--state-dir") || undefined;
const proofOut = getStringArg(args, "--proof-out") || undefined;
const execute = hasFlag(args, "--execute");
const confirmed = hasFlag(args, "--confirm-identity-mutation");

if (!isIdentityProofPhase(phase)) {
  console.error(`Error: --phase must be one of: ${IDENTITY_PROOF_PHASES.join(", ")}`);
  process.exit(2);
}

if (registerSpecialties.length === 0) {
  console.error("Error: --register-specialties must contain at least one specialty");
  process.exit(2);
}

if (execute && !confirmed) {
  console.error("Error: --execute requires --confirm-identity-mutation for live identity mutation");
  process.exit(2);
}

const connect = await loadConnect();
const omni = await connect({ stateDir });
const agentAddress = omni.address;

if (!execute) {
  emit({
    attempted: false,
    ok: false,
    phase,
    command: process.argv.join(" "),
    commit: shortCommit(),
    address: agentAddress,
    execution: {
      mode: "dry-run",
      requires: ["--execute", "--confirm-identity-mutation"],
      wouldMutate: phase === "cleanup" ? ["linked-agent cleanup"] : phase === "register" ? ["public agent profile"] : phase === "human-link" ? ["human-agent link"] : ["public agent profile", "human-agent link", "linked-agent cleanup"],
    },
    publicInputs: {
      registerName,
      registerDescription,
      registerSpecialties,
    },
    message: "Dry run only. Re-run with --execute --confirm-identity-mutation to perform the selected live identity proof phase.",
  });
  process.exit(0);
}

let register: unknown = null;
let profileAfterRegister: unknown = null;
let challenge: unknown = null;
let sign: { ok?: boolean; error?: unknown; signature?: unknown } | null = null;
let claim: unknown = null;
let approve: unknown = null;
let linked: unknown = null;
let unlink: unknown = null;
let linkedAfter: unknown = null;

if (phase === "register" || phase === "full") {
  register = await omni.colony.register({
    name: registerName,
    description: registerDescription,
    specialties: registerSpecialties,
  });
  profileAfterRegister = await readRegisteredProfile(omni, agentAddress, registerName);
}

if (phase === "human-link" || phase === "full") {
  challenge = await omni.colony.createAgentLinkChallenge(agentAddress);
  const challengeValue = isOkApiResult(challenge)
    ? challenge.data.challenge ?? challenge.data.nonce ?? challenge.data.challengeId
    : undefined;
  sign = isOkApiResult(challenge)
    ? await omni.chain.signMessage(challenge.data.message)
    : { ok: false, error: "challenge failed" };
  const signature = sign.ok && sign.signature && typeof sign.signature === "object"
    ? ((sign.signature as Record<string, unknown>).data ?? sign.signature)
    : sign.signature;

  claim = typeof challengeValue === "string" && typeof signature === "string"
    ? await omni.colony.claimAgentLink({
        challenge: challengeValue,
        agentAddress,
        signature,
      })
    : null;
  approve = isOkApiResult(claim) && typeof challengeValue === "string"
    ? await omni.colony.approveAgentLink({
        challenge: challengeValue,
        agentAddress,
        action: "approve",
      })
    : null;
  linked = await omni.colony.getLinkedAgents();
}

if (phase === "cleanup" || phase === "full") {
  unlink = await omni.colony.unlinkAgent(agentAddress);
  linkedAfter = await omni.colony.getLinkedAgents();
}

const registerOk = phase !== "register" && phase !== "full"
  ? true
  : isOkApiResult(register) && profileMatches(profileAfterRegister, agentAddress, registerName);
const linkOk = phase !== "human-link" && phase !== "full"
  ? true
  : isOkApiResult(challenge) && !!sign?.ok && isOkApiResult(claim) && isOkApiResult(approve) && linkedContains(linked, agentAddress);
const cleanupOk = phase !== "cleanup" && phase !== "full"
  ? true
  : isOkApiResult(unlink) && !linkedContains(linkedAfter, agentAddress);
const ok = registerOk && linkOk && cleanupOk;

emit({
  attempted: true,
  ok,
  phase,
  command: process.argv.join(" "),
  commit: shortCommit(),
  address: agentAddress,
  execution: {
    mode: "execute",
    confirmedIdentityMutation: confirmed,
  },
  publicInputs: {
    registerName,
    registerDescription,
    registerSpecialties,
  },
  verdicts: {
    register: phase === "register" || phase === "full" ? registerOk ? "pass" : "degraded" : "not_applicable",
    humanLink: phase === "human-link" || phase === "full" ? linkOk ? "pass" : "degraded" : "not_applicable",
    cleanup: phase === "cleanup" || phase === "full" ? cleanupOk ? "pass" : "degraded" : "not_applicable",
  },
  register: summarizeMutationResult(register, "register() accepted the public profile update"),
  profileAfterRegister: summarizeAgentProfile(profileAfterRegister, agentAddress),
  challenge: summarizeChallenge(challenge),
  sign: sign?.ok
    ? { ok: true, hasSignature: true, redacted: true }
    : { ok: false, detail: typeof sign?.error === "string" ? sign.error.slice(0, 200) : "sign failed" },
  claim: summarizeMutationResult(claim, "claimAgentLink() accepted the redacted challenge handle"),
  approve: summarizeMutationResult(approve, "approveAgentLink() accepted the redacted challenge handle plus agentAddress"),
  linked: summarizeLinkedAgents(linked, agentAddress),
  unlink: summarizeMutationResult(unlink, "unlinkAgent() cleaned up the live link"),
  linkedAfter: summarizeLinkedAgents(linkedAfter, agentAddress),
});

process.exit(ok ? 0 : 1);

function emit(report: Record<string, unknown>): void {
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (proofOut) {
    mkdirSync(dirname(proofOut), { recursive: true });
    writeFileSync(proofOut, json, "utf8");
  }
  console.log(json);
}

async function readRegisteredProfile(omni: any, agentAddress: string, registerName: string): Promise<unknown> {
  const direct = await omni.colony.getAgentProfile(agentAddress);
  if (profileMatches(direct, agentAddress, registerName)) {
    return direct;
  }

  const list = await omni.colony.getAgents();
  if (isOkApiResult(list) && Array.isArray(list.data.agents)) {
    const match = list.data.agents.find((agent) => {
      const record = agent as Record<string, unknown>;
      return typeof record.address === "string"
        && record.address.toLowerCase() === agentAddress.toLowerCase();
    });
    if (match) {
      return { ok: true, status: list.status, data: match };
    }
  }

  return direct;
}
