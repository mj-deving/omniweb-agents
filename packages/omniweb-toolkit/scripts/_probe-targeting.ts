import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";

export interface ProbeRuntimeTargetInput {
  envPath?: string;
  agentName?: string;
  stateDir?: string;
}

export interface ProbeRuntimeTargetSummary {
  credentialSource: "explicit-env-path" | "agent-name" | "default-runtime";
  envPath: "provided-redacted" | null;
  agentName: string | null;
  stateDir: "provided-redacted" | null;
}

export interface ExplicitCredentialTargetOptions {
  requireExplicit?: boolean;
  purpose?: string;
}

export function validateRequiredValueFlags(args: string[], flags: readonly string[]): string | null {
  for (const flag of flags) {
    const index = args.indexOf(flag);
    if (index >= 0 && (!args[index + 1] || args[index + 1].startsWith("-"))) {
      return `Error: ${flag} requires a value`;
    }
  }
  return null;
}

export function summarizeProbeRuntimeTarget(input: ProbeRuntimeTargetInput): ProbeRuntimeTargetSummary {
  return {
    credentialSource: input.envPath
      ? "explicit-env-path"
      : input.agentName
        ? "agent-name"
        : "default-runtime",
    envPath: input.envPath ? "provided-redacted" : null,
    agentName: input.agentName ?? null,
    stateDir: input.stateDir ? "provided-redacted" : null,
  };
}

export function redactProbeCommand(argv: string[]): string {
  const redactedValueByFlag = new Map([
    ["--env-path", "<redacted-env-path>"],
    ["--state-dir", "<redacted-state-dir>"],
    ["--proof-out", "<redacted-proof-out>"],
  ]);
  const out: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    out.push(redactProbeCommandArg(arg));
    const redactedValue = redactedValueByFlag.get(arg);
    if (redactedValue && i + 1 < argv.length) {
      out.push(redactedValue);
      i += 1;
    }
  }
  return out.join(" ");
}

function redactProbeCommandArg(arg: string): string {
  if (!isAbsolute(arg)) return arg;

  const relativeToCwd = relative(process.cwd(), arg);
  if (relativeToCwd && !relativeToCwd.startsWith("..") && !isAbsolute(relativeToCwd)) {
    return relativeToCwd;
  }

  const name = basename(arg);
  if (name === "node" || name === "tsx") return name;

  return `<redacted-local-path>/${name}`;
}

export function assertExplicitCredentialTargetExists(
  input: ProbeRuntimeTargetInput,
  options: ExplicitCredentialTargetOptions = {},
): void {
  if (!input.envPath && !input.agentName) {
    if (options.requireExplicit) {
      const purpose = options.purpose ?? "Live mutation";
      throw new Error(`${purpose} requires --env-path or --agent-name targeting an existing credentials profile`);
    }
    return;
  }

  if (input.envPath) {
    const resolved = resolve(input.envPath.replace(/^~/, homedir()));
    if (!existsSync(resolved)) {
      throw new Error("--env-path must point to an existing credentials file");
    }
  }
  if (!input.envPath && input.agentName) {
    const resolved = resolve(homedir(), ".config", "demos", `credentials-${input.agentName}`);
    if (!existsSync(resolved)) {
      throw new Error("--agent-name credentials profile not found");
    }
  }
}

export function summarizeSignatureShape(signature: unknown): Record<string, unknown> {
  if (typeof signature === "string") {
    return { signatureType: "string", hasSignature: signature.length > 0, redacted: true };
  }
  if (signature && typeof signature === "object") {
    const record = signature as Record<string, unknown>;
    return {
      signatureType: "object",
      hasSignature: typeof record.data === "string" && record.data.length > 0,
      dataType: typeof record.data,
      algorithm: typeof record.type === "string" ? record.type : null,
      redacted: true,
    };
  }
  return { signatureType: typeof signature, hasSignature: false, redacted: true };
}

export function extractSignatureString(signature: unknown): string | null {
  if (typeof signature === "string" && signature.length > 0) return signature;
  if (signature && typeof signature === "object") {
    const data = (signature as Record<string, unknown>).data;
    return typeof data === "string" && data.length > 0 ? data : null;
  }
  return null;
}

export function publicKeyToHex(publicKey: unknown): string | null {
  if (typeof publicKey === "string" && publicKey.length > 0) return publicKey;
  if (publicKey instanceof Uint8Array) {
    return Buffer.from(publicKey).toString("hex");
  }
  if (Array.isArray(publicKey) && publicKey.every((value) => Number.isInteger(value))) {
    return Buffer.from(publicKey).toString("hex");
  }
  return null;
}

export function emitJsonReport(report: Record<string, unknown>, proofOut?: string): void {
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (proofOut) {
    mkdirSync(dirname(proofOut), { recursive: true });
    writeFileSync(proofOut, json, "utf8");
  }
  console.log(json);
}
