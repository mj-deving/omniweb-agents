#!/usr/bin/env npx tsx

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_BASE_URL =
  process.env.SUPERCOLONY_API_URL ??
  process.env.SUPERCOLONY_API ??
  "https://supercolony.ai";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));

export const PACKAGE_ROOT = resolve(THIS_DIR, "..");
export const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");
export const DEFAULT_SNAPSHOT_DIR = resolve(
  REPO_ROOT,
  "docs",
  "research",
  "supercolony-discovery",
);

export interface FetchTextOptions {
  baseUrl?: string;
  timeoutMs?: number;
  token?: string | null;
  accept?: string;
}

export interface FetchTextResult {
  ok: boolean;
  status: number;
  url: string;
  body: string;
  error?: string;
}

export function hasFlag(args: string[], flag: string, alias?: string): boolean {
  return args.includes(flag) || (alias ? args.includes(alias) : false);
}

export function getStringArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  return args[index + 1];
}

export function getNumberArg(args: string[], flag: string): number | undefined {
  const raw = getStringArg(args, flag);
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function loadToken(): string | null {
  const authPath = resolve(homedir(), ".supercolony-auth.json");
  if (!existsSync(authPath)) return null;

  try {
    const parsed = JSON.parse(readFileSync(authPath, "utf8")) as { token?: string };
    return typeof parsed.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
}

export async function fetchText(
  path: string,
  options: FetchTextOptions = {},
): Promise<FetchTextResult> {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const token = options.token ?? loadToken();
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    Accept: options.accept ?? "*/*",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    return {
      ok: response.ok,
      status: response.status,
      url,
      body: await response.text(),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      body: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function normalizeBody(path: string, body: string): string {
  if (path.endsWith(".json")) {
    try {
      return JSON.stringify(sortKeys(JSON.parse(body)), null, 2);
    } catch {
      return body.replace(/\r\n/g, "\n").trim();
    }
  }

  return body.replace(/\r\n/g, "\n").trim();
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const entries = Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => [key, sortKeys(child)]);

  return Object.fromEntries(entries);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
