import { existsSync, readFileSync, statSync } from "node:fs";
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

interface ConfigFileRead {
  path: string;
  present: boolean;
  readable: boolean;
  values: Record<string, string | undefined>;
  error?: string;
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

function readConfigFile(path: string): ConfigFileRead {
  if (!filePresent(path)) {
    return { path, present: false, readable: false, values: {} };
  }

  try {
    if (!statSync(path).isFile()) {
      return { path, present: true, readable: false, values: {}, error: "not a regular file" };
    }

    const content = readFileSync(path, "utf8");
    return {
      path,
      present: true,
      readable: true,
      values: {
        DEMOS_MNEMONIC: parseConfigValue(content, "DEMOS_MNEMONIC"),
        RPC_URL: parseConfigValue(content, "RPC_URL"),
        DEMOS_RPC_URL: parseConfigValue(content, "DEMOS_RPC_URL"),
        SUPERCOLONY_API: parseConfigValue(content, "SUPERCOLONY_API"),
        SUPERCOLONY_API_URL: parseConfigValue(content, "SUPERCOLONY_API_URL"),
      },
    };
  } catch (error) {
    return {
      path,
      present: true,
      readable: false,
      values: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function hasValue(...values: Array<string | undefined>): boolean {
  return values.some((value) => Boolean(value?.trim()));
}

function selectRuntimeConfigSource(sources: ConfigFileRead[]): ConfigFileRead | undefined {
  return sources.find((source) => source.present);
}

export function checkWriteReadiness(options: WriteReadinessOptions = {}): WriteReadinessResult {
  const cwd = options.cwd ?? process.cwd();
  const agentName = options.agentName?.trim();
  const home = options.homeDir ?? homedir();
  const credentialsPath = resolve(home, ".config", "demos", "credentials");
  const namedCredentialsPath = agentName
    ? resolve(home, ".config", "demos", `credentials-${agentName}`)
    : null;
  const dotEnvPath = resolve(cwd, ".env");

  const credentialSourcesChecked = [
    credentialsPath,
    ...(namedCredentialsPath ? [namedCredentialsPath] : []),
    dotEnvPath,
  ];

  const namedCredentials = namedCredentialsPath ? readConfigFile(namedCredentialsPath) : null;
  const sharedCredentials = readConfigFile(credentialsPath);
  const dotEnv = readConfigFile(dotEnvPath);
  const hasDotEnv = filePresent(dotEnvPath);
  const runtimeSource = selectRuntimeConfigSource([
    ...(namedCredentials ? [namedCredentials] : []),
    sharedCredentials,
    dotEnv,
  ]);
  const runtimeValues = runtimeSource?.readable ? runtimeSource.values : {};

  const hasMnemonicConfig = hasValue(runtimeValues.DEMOS_MNEMONIC);
  const missingEnv: string[] = [];
  if (!hasMnemonicConfig) {
    missingEnv.push("DEMOS_MNEMONIC");
  }

  const missingPackages: string[] = [];
  if (!packagePresent("@kynesyslabs/demosdk")) {
    missingPackages.push("@kynesyslabs/demosdk");
  }
  if (!packagePresent("better-sqlite3")) {
    missingPackages.push("better-sqlite3");
  }

  const canAuth = missingEnv.length === 0;
  const canWrite = missingEnv.length === 0 && missingPackages.length === 0;

  const notes = ["Read-only client is usable without write substrate"];
  if (missingPackages.length > 0) {
    notes.push("Write flows require optional wallet/runtime dependencies");
  }
  if (hasDotEnv) {
    notes.push(`Checked .env at ${dotEnvPath} for explicit write config values`);
  }
  if (runtimeSource?.present) {
    notes.push(`Runtime credential source: ${runtimeSource.path}`);
  }
  if (runtimeSource?.present && !runtimeSource.readable) {
    notes.push(`Could not read runtime credential source ${runtimeSource.path}: ${runtimeSource.error ?? "unreadable"}`);
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
