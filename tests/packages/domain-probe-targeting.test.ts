import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  assertExplicitCredentialTargetExists,
  extractSignatureString,
  publicKeyToHex,
  redactProbeCommand,
  summarizeProbeRuntimeTarget,
  summarizeSignatureShape,
  validateRequiredValueFlags,
} from "../../packages/omniweb-toolkit/scripts/_probe-targeting.js";

describe("domain probe credential targeting safety", () => {
  it("requires an explicit existing credentials target for live mutation probes", () => {
    expect(() => assertExplicitCredentialTargetExists(
      {},
      { requireExplicit: true, purpose: "Live domain mutation" },
    )).toThrow("Live domain mutation requires --env-path or --agent-name");

    const result = spawnSync(
      "node",
      [
        "--import",
        "tsx",
        "packages/omniweb-toolkit/scripts/probe-storage.ts",
        "--broadcast",
      ],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Live storage mutation requires --env-path or --agent-name");
    expect(result.stdout).toBe("");
  });

  it("rejects missing and option-looking target values before runtime loading", () => {
    expect(validateRequiredValueFlags(["--env-path"], ["--env-path"])).toBe("Error: --env-path requires a value");
    expect(validateRequiredValueFlags(["--env-path", "--broadcast"], ["--env-path"])).toBe("Error: --env-path requires a value");

    const result = spawnSync(
      "node",
      [
        "--import",
        "tsx",
        "packages/omniweb-toolkit/scripts/probe-escrow.ts",
        "--platform",
        "github",
        "--username",
        "target",
        "--env-path",
        "--broadcast",
      ],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--env-path requires a value");
    expect(result.stdout).toBe("");
  });

  it("rejects explicit missing agent profiles in dry-run mode before runtime loading", () => {
    const result = spawnSync(
      "node",
      [
        "--import",
        "tsx",
        "packages/omniweb-toolkit/scripts/probe-ipfs.ts",
        "--agent-name",
        "definitely-missing",
      ],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--agent-name credentials profile not found");
    expect(result.stdout).toBe("");
  });

  it("redacts local target paths while preserving named credential markers", () => {
    const summary = summarizeProbeRuntimeTarget({
      envPath: "EXAMPLE_PRIVATE_ENV_FILE",
      agentName: "throwaway-proof-agent",
      stateDir: "EXAMPLE_STATE_DIR",
    });
    const command = redactProbeCommand([
      "node",
      "probe-storage.ts",
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

  it("summarizes signatures and public keys without exposing raw values", () => {
    const objectSignature = { type: "falcon", data: "SAMPLE_SIGNATURE_VALUE" };
    const summary = summarizeSignatureShape(objectSignature);

    expect(extractSignatureString(objectSignature)).toBe("SAMPLE_SIGNATURE_VALUE");
    expect(summary).toEqual({
      signatureType: "object",
      hasSignature: true,
      dataType: "string",
      algorithm: "falcon",
      redacted: true,
    });
    expect(JSON.stringify(summary)).not.toContain("SAMPLE_SIGNATURE_VALUE");
    expect(publicKeyToHex(new Uint8Array([1, 2, 3, 4]))).toBe("01020304");
  });
});
