import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createRequire } from "node:module";

export interface WriteReadinessOptions {
  cwd?: string;
  agentName?: string;
}

export interface WriteReadinessResult {
  ok: boolean;
  canRead: true;
  canAuth: boolean;
  canWrite: boolean;
  missingEnv: string[];
  missingPackages: string[];
  credentialSourcesChecked: string[];
  notes: string[];
}

const require = createRequire(import.meta.url);

function packagePresent(specifier: string): boolean {
  try {
    require.resolve(`${specifier}/package.json`);
    return true;
  } catch {
    return false;
  }
}

function filePresent(path: string): boolean {
  return existsSync(path);
}

export function checkWriteReadiness(options: WriteReadinessOptions = {}): WriteReadinessResult {
  const cwd = options.cwd ?? process.cwd();
  const agentName = options.agentName?.trim();
  const credentialsPath = resolve(homedir(), ".config", "demos", "credentials");
  const namedCredentialsPath = agentName
    ? resolve(homedir(), ".config", "demos", `credentials-${agentName}`)
    : null;
  const dotEnvPath = resolve(cwd, ".env");

  const credentialSourcesChecked = [
    "process.env.DEMOS_MNEMONIC",
    credentialsPath,
    ...(namedCredentialsPath ? [namedCredentialsPath] : []),
    dotEnvPath,
  ];

  const hasMnemonicEnv = Boolean(process.env.DEMOS_MNEMONIC);
  const hasRpcEnv = Boolean(process.env.RPC_URL || process.env.DEMOS_RPC_URL);
  const hasApiEnv = Boolean(process.env.SUPERCOLONY_API || process.env.SUPERCOLONY_API_URL);
  const hasCredentialsFile = filePresent(credentialsPath) || (namedCredentialsPath ? filePresent(namedCredentialsPath) : false);
  const hasDotEnv = filePresent(dotEnvPath);

  const missingEnv: string[] = [];
  if (!hasMnemonicEnv && !hasCredentialsFile && !hasDotEnv) {
    missingEnv.push("DEMOS_MNEMONIC");
  }
  if (!hasRpcEnv && !hasDotEnv) {
    missingEnv.push("RPC_URL");
  }
  if (!hasApiEnv && !hasDotEnv) {
    missingEnv.push("SUPERCOLONY_API");
  }

  const missingPackages: string[] = [];
  if (!packagePresent("@kynesyslabs/demosdk")) {
    missingPackages.push("@kynesyslabs/demosdk");
  }
  if (!packagePresent("better-sqlite3")) {
    missingPackages.push("better-sqlite3");
  }

  const canAuth = missingEnv.length === 0 || (!missingEnv.includes("DEMOS_MNEMONIC") && !missingEnv.includes("SUPERCOLONY_API"));
  const canWrite = missingEnv.length === 0 && missingPackages.length === 0;

  const notes = ["Read-only client is usable without write substrate"];
  if (missingPackages.length > 0) {
    notes.push("Write flows require optional wallet/runtime dependencies");
  }
  if (hasDotEnv) {
    notes.push(`Detected .env at ${dotEnvPath}; readiness assumes it may provide write config`);
  }

  return {
    ok: canWrite,
    canRead: true,
    canAuth,
    canWrite,
    missingEnv,
    missingPackages,
    credentialSourcesChecked,
    notes,
  };
}
