import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";

/**
 * Clear inherited insecure TLS overrides for package-owned probes unless the caller
 * explicitly opts back in. The live SuperColony checks succeed here with normal
 * certificate verification, and inherited NODE_TLS_REJECT_UNAUTHORIZED=0 causes
 * noisy warnings plus weaker security than these scripts need.
 */
if (
  process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0" &&
  process.env.SUPERCOLONY_ALLOW_INSECURE_TLS !== "1"
) {
  delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
}

export const DEFAULT_BASE_URL =
  process.env.SUPERCOLONY_API_URL ??
  process.env.SUPERCOLONY_API ??
  "https://supercolony.ai";

export interface FetchTextOptions {
  baseUrl?: string;
  timeoutMs?: number;
  token?: string | null;
  accept?: string;
  method?: "GET" | "POST";
  body?: unknown;
}

export interface FetchTextResult {
  ok: boolean;
  status: number;
  url: string;
  body: string;
  contentType?: string | null;
  error?: string;
}

export function loadToken(): string | null {
  const authPath = `${homedir()}/.supercolony-auth.json`;
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
  const method = options.method ?? "GET";
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    Accept: options.accept ?? "*/*",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error(`request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const response = await Promise.race([
      fetch(url, {
        method,
        body,
        headers,
        signal: controller.signal,
      }),
      timeout,
    ]).finally(() => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    });

    return {
      ok: response.ok,
      status: response.status,
      url,
      body: await response.text(),
      contentType: response.headers.get("content-type"),
    };
  } catch (error) {
    const curlFallback = fetchTextWithCurl(url, headers, timeoutMs, method, body);
    if (curlFallback) {
      return curlFallback;
    }

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

function fetchTextWithCurl(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
  method: "GET" | "POST",
  body?: string,
): FetchTextResult | null {
  if (!hasCurl()) {
    return null;
  }

  const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
  const args = [
    "-L",
    "-sS",
    "--max-time",
    String(timeoutSeconds),
    "-H",
    `Accept: ${headers.Accept}`,
  ];

  if (headers.Authorization) {
    args.push("-H", `Authorization: ${headers.Authorization}`);
  }

  if (body !== undefined) {
    args.push("-H", "Content-Type: application/json");
  }

  if (method !== "GET") {
    args.push("-X", method);
  }

  if (body !== undefined) {
    args.push("--data-raw", body);
  }

  args.push("-w", "\n%{http_code}", url);

  const result = spawnSync("curl", args, {
    encoding: "utf8",
  });

  if (result.error) {
    return null;
  }

  if (result.status !== 0 && !result.stdout) {
    return {
      ok: false,
      status: 0,
      url,
      body: "",
      error: result.stderr.trim() || `curl exited with status ${result.status ?? 1}`,
    };
  }

  const output = result.stdout ?? "";
  const newlineIndex = output.lastIndexOf("\n");
  if (newlineIndex < 0) {
    return {
      ok: false,
      status: 0,
      url,
      body: "",
      error: "curl fallback returned an unexpected response shape",
    };
  }

  const responseBody = output.slice(0, newlineIndex);
  const statusText = output.slice(newlineIndex + 1).trim();
  const status = Number(statusText);

  if (!Number.isFinite(status)) {
    return {
      ok: false,
      status: 0,
      url,
      body: "",
      error: `curl fallback returned invalid status: ${statusText}`,
    };
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    body: responseBody,
    error: result.status === 0 ? undefined : result.stderr.trim() || undefined,
  };
}

function hasCurl(): boolean {
  const result = spawnSync("curl", ["--version"], {
    encoding: "utf8",
  });

  return result.status === 0;
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
