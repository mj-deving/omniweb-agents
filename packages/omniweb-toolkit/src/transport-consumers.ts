export type TransportAuthState =
  | "not_required"
  | "missing_token"
  | "ready"
  | "expired"
  | "invalid"
  | "forbidden"
  | "unknown_error";

export interface TransportAuthInput {
  token?: string | null;
  status?: number;
  body?: unknown;
}

export interface TransportAuthStatus {
  state: TransportAuthState;
  hasToken: boolean;
  redactedToken: string | null;
  reasonCodes: string[];
}

export interface RssFeedSummary {
  contentType: "application/rss+xml" | "application/atom+xml" | "text/xml" | "unknown";
  title: string | null;
  entryCount: number;
  linkCount: number;
  rawLength: number;
}

export interface FeedRssResponse {
  xml: string;
  summary: RssFeedSummary;
}

export interface FeedStreamPlanOptions {
  token?: string | null;
  lastEventId?: string | null;
  openStream?: boolean;
}

export interface FeedStreamRequestPlan {
  endpoint: "/api/feed/stream";
  method: "GET";
  accept: "text/event-stream";
  headers: Record<string, string>;
  opensStream: boolean;
  noSpend: true;
  noMutation: true;
  auth: TransportAuthStatus;
  replay: {
    requested: boolean;
    lastEventId: string | null;
  };
  notes: string[];
}

export interface ServerSentEventRecord {
  event: string;
  data: string;
  id: string | null;
  retry: number | null;
}

export function classifyTransportAuth(input: TransportAuthInput = {}): TransportAuthStatus {
  const token = typeof input.token === "string" ? input.token.trim() : "";
  const bodyText = stringifyBody(input.body).toLowerCase();
  const reasonCodes: string[] = [];

  if (!token) {
    reasonCodes.push("auth_token_missing");
    return {
      state: "missing_token",
      hasToken: false,
      redactedToken: null,
      reasonCodes,
    };
  }

  if (input.status === 401 && /expir|stale|refresh|invalid/.test(bodyText)) {
    reasonCodes.push("auth_token_expired_or_invalid");
    return authStatus("expired", token, reasonCodes);
  }
  if (input.status === 401) {
    reasonCodes.push("auth_token_invalid");
    return authStatus("invalid", token, reasonCodes);
  }
  if (input.status === 403) {
    reasonCodes.push("auth_token_forbidden");
    return authStatus("forbidden", token, reasonCodes);
  }
  if (typeof input.status === "number" && input.status >= 400) {
    reasonCodes.push("auth_status_unknown_error");
    return authStatus("unknown_error", token, reasonCodes);
  }

  reasonCodes.push("auth_token_ready");
  return authStatus("ready", token, reasonCodes);
}

export function summarizeRssFeed(xml: string, contentType = ""): RssFeedSummary {
  const lowerContentType = contentType.toLowerCase();
  const normalizedContentType: RssFeedSummary["contentType"] = lowerContentType.includes("atom")
    ? "application/atom+xml"
    : lowerContentType.includes("rss")
      ? "application/rss+xml"
      : lowerContentType.includes("xml")
        ? "text/xml"
        : "unknown";

  return {
    contentType: normalizedContentType,
    title: firstTagText(xml, "title"),
    entryCount: countTag(xml, "entry") + countTag(xml, "item"),
    linkCount: countTag(xml, "link"),
    rawLength: xml.length,
  };
}

export function buildFeedStreamRequestPlan(options: FeedStreamPlanOptions = {}): FeedStreamRequestPlan {
  const headers: Record<string, string> = {
    accept: "text/event-stream",
  };
  const token = typeof options.token === "string" ? options.token.trim() : "";
  if (token) headers.authorization = `Bearer ${token}`;
  const lastEventId = typeof options.lastEventId === "string" && options.lastEventId.trim()
    ? options.lastEventId.trim()
    : null;
  if (lastEventId) headers["last-event-id"] = lastEventId;

  return {
    endpoint: "/api/feed/stream",
    method: "GET",
    accept: "text/event-stream",
    headers: redactSensitiveHeaders(headers),
    opensStream: options.openStream === true,
    noSpend: true,
    noMutation: true,
    auth: classifyTransportAuth({ token }),
    replay: {
      requested: lastEventId !== null,
      lastEventId,
    },
    notes: options.openStream === true
      ? ["Caller explicitly requested opening the SSE stream; this is still no-spend/no-mutation."]
      : ["Default consumer plan does not open the long-lived stream."],
  };
}

export function parseServerSentEvents(chunk: string): ServerSentEventRecord[] {
  return chunk
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(parseServerSentEventBlock);
}

export function redactSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = /authorization|token|cookie/i.test(key) ? redactToken(value) : value;
  }
  return out;
}

function parseServerSentEventBlock(block: string): ServerSentEventRecord {
  const lines = block.split(/\r?\n/);
  const data: string[] = [];
  let event = "message";
  let id: string | null = null;
  let retry: number | null = null;

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator >= 0 ? line.slice(0, separator) : line;
    const value = separator >= 0 ? line.slice(separator + 1).replace(/^ /, "") : "";
    if (field === "event") event = value || "message";
    if (field === "data") data.push(value);
    if (field === "id") id = value || null;
    if (field === "retry") {
      const parsed = Number(value);
      retry = Number.isFinite(parsed) ? parsed : null;
    }
  }

  return {
    event,
    data: data.join("\n"),
    id,
    retry,
  };
}

function authStatus(state: TransportAuthState, token: string, reasonCodes: string[]): TransportAuthStatus {
  return {
    state,
    hasToken: true,
    redactedToken: redactToken(token),
    reasonCodes,
  };
}

function redactToken(token: string): string {
  const normalized = token.replace(/^Bearer\s+/i, "");
  if (normalized.length <= 8) return "[redacted]";
  return `${normalized.slice(0, 4)}...[redacted]...${normalized.slice(-4)}`;
}

function stringifyBody(body: unknown): string {
  if (typeof body === "string") return body;
  if (body == null) return "";
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

function firstTagText(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  return match?.[1]?.replace(/<[^>]+>/g, "").trim() || null;
}

function countTag(xml: string, tag: string): number {
  return xml.match(new RegExp(`<${tag}(\\s|>|/)`, "gi"))?.length ?? 0;
}
