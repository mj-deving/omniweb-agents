import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createRequire } from "node:module";

export interface WriteReadinessOptions {
  cwd?: string;
  agentName?: string;
  env?: Record<string, string | undefined>;
  homeDir?: string;
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

function parseConfigValue(content: string, key: string): string | undefined {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const doubleQuoted = trimmed.match(new RegExp(`^${key}="(.*?)"\\s*(?:#.*)?$`));
    if (doubleQuoted?.[1]?.trim()) return doubleQuoted[1].trim();

    const singleQuoted = trimmed.match(new RegExp(`^${key}='(.*?)'\\s*(?:#.*)?$`));
    if (singleQuoted?.[1]?.trim()) return singleQuoted[1].trim();

    const unquoted = trimmed.match(new RegExp(`^${key}=([^#]*)`));
    const value = unquoted?.[1]?.trim();
    if (value) return value;
  }
  return undefined;
}

function readConfigFile(path: string): Record<string, string | undefined> {
  if (!filePresent(path)) return {};
  const content = readFileSync(path, "utf8");
  return {
    DEMOS_MNEMONIC: parseConfigValue(content, "DEMOS_MNEMONIC"),
    RPC_URL: parseConfigValue(content, "RPC_URL"),
    DEMOS_RPC_URL: parseConfigValue(content, "DEMOS_RPC_URL"),
    SUPERCOLONY_API: parseConfigValue(content, "SUPERCOLONY_API"),
    SUPERCOLONY_API_URL: parseConfigValue(content, "SUPERCOLONY_API_URL"),
  };
}

function hasValue(...values: Array<string | undefined>): boolean {
  return values.some((value) => Boolean(value?.trim()));
}

export function checkWriteReadiness(options: WriteReadinessOptions = {}): WriteReadinessResult {
  const cwd = options.cwd ?? process.cwd();
  const agentName = options.agentName?.trim();
  const env = options.env ?? process.env;
  const home = options.homeDir ?? homedir();
  const credentialsPath = resolve(home, ".config", "demos", "credentials");
  const namedCredentialsPath = agentName
    ? resolve(home, ".config", "demos", `credentials-${agentName}`)
    : null;
  const dotEnvPath = resolve(cwd, ".env");

  const credentialSourcesChecked = [
    "process.env.DEMOS_MNEMONIC",
    credentialsPath,
    ...(namedCredentialsPath ? [namedCredentialsPath] : []),
    dotEnvPath,
  ];

  const sharedCredentials = readConfigFile(credentialsPath);
  const namedCredentials = namedCredentialsPath ? readConfigFile(namedCredentialsPath) : {};
  const dotEnv = readConfigFile(dotEnvPath);
  const hasDotEnv = filePresent(dotEnvPath);

  const hasMnemonicConfig = hasValue(
    env.DEMOS_MNEMONIC,
    namedCredentials.DEMOS_MNEMONIC,
    sharedCredentials.DEMOS_MNEMONIC,
    dotEnv.DEMOS_MNEMONIC,
  );
  const hasRpcConfig = hasValue(
    env.RPC_URL,
    env.DEMOS_RPC_URL,
    namedCredentials.RPC_URL,
    namedCredentials.DEMOS_RPC_URL,
    sharedCredentials.RPC_URL,
    sharedCredentials.DEMOS_RPC_URL,
    dotEnv.RPC_URL,
    dotEnv.DEMOS_RPC_URL,
  );
  const hasApiConfig = hasValue(
    env.SUPERCOLONY_API,
    env.SUPERCOLONY_API_URL,
    namedCredentials.SUPERCOLONY_API,
    namedCredentials.SUPERCOLONY_API_URL,
    sharedCredentials.SUPERCOLONY_API,
    sharedCredentials.SUPERCOLONY_API_URL,
    dotEnv.SUPERCOLONY_API,
    dotEnv.SUPERCOLONY_API_URL,
  );

  const missingEnv: string[] = [];
  if (!hasMnemonicConfig) {
    missingEnv.push("DEMOS_MNEMONIC");
  }
  if (!hasRpcConfig) {
    missingEnv.push("RPC_URL");
  }
  if (!hasApiConfig) {
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
    notes.push(`Checked .env at ${dotEnvPath} for explicit write config values`);
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
