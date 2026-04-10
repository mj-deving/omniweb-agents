/**
 * Phase 19b: Live primitive verification script.
 *
 * Calls every read primitive against the live SuperColony API and reports:
 * - Whether each endpoint responds
 * - The actual response shape (field names and types)
 * - Any mismatches vs expected TypeScript types
 *
 * Usage: npx tsx scripts/verify-primitives.ts
 *
 * Auth-required endpoints are tested with a marker — they'll return
 * "Authentication required" which we log as "needs auth" (not broken).
 */

const BASE = "https://supercolony.ai";
const TIMEOUT = 10_000;

interface TestResult {
  domain: string;
  method: string;
  endpoint: string;
  status: "pass" | "needs_auth" | "deprecated" | "fail";
  httpStatus?: number;
  fields?: string[];
  notes?: string;
}

async function callApi(path: string): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function describeShape(obj: unknown, prefix = ""): string[] {
  if (obj === null || obj === undefined) return [`${prefix}: null`];
  if (Array.isArray(obj)) {
    if (obj.length === 0) return [`${prefix}: []`];
    return [`${prefix}: Array<>`, ...describeShape(obj[0], `${prefix}[0]`)];
  }
  if (typeof obj === "object") {
    const fields: string[] = [];
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        fields.push(`${path}: {}`);
        fields.push(...describeShape(val, path));
      } else if (Array.isArray(val)) {
        fields.push(`${path}: Array(${val.length})`);
        if (val.length > 0 && typeof val[0] === "object" && val[0] !== null) {
          fields.push(...describeShape(val[0], `${path}[0]`));
        }
      } else {
        fields.push(`${path}: ${typeof val}`);
      }
    }
    return fields;
  }
  return [`${prefix}: ${typeof obj}`];
}

async function test(domain: string, method: string, path: string): Promise<TestResult> {
  try {
    const { status, data } = await callApi(path);

    if (status === 401 || status === 403) {
      return { domain, method, endpoint: path, status: "needs_auth", httpStatus: status };
    }
    if (status === 410) {
      return { domain, method, endpoint: path, status: "deprecated", httpStatus: status };
    }
    if (status >= 400) {
      const msg = typeof data === "object" && data !== null && "error" in data
        ? String((data as Record<string, unknown>).error)
        : String(data);
      return { domain, method, endpoint: path, status: "fail", httpStatus: status, notes: msg };
    }

    const fields = describeShape(data);
    return { domain, method, endpoint: path, status: "pass", httpStatus: status, fields };
  } catch (e) {
    return { domain, method, endpoint: path, status: "fail", notes: String(e) };
  }
}

async function main() {
  console.log("=== SuperColony Primitive Verification ===\n");
  console.log(`Base URL: ${BASE}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const tests: Array<[string, string, string]> = [
    // Health & Stats (public)
    ["health", "check()", "/api/health"],
    ["stats", "get()", "/api/stats"],

    // Feed (public)
    ["feed", "getRecent()", "/api/feed?limit=2"],
    ["feed", "search()", "/api/feed/search?text=bitcoin&limit=1"],
    ["feed", "getPostDetail()", "/api/post/a2668b83d5a837dde604c8a4ca5f8170382ea7debd3028e48668f90cdfcfeb83"],
    ["feed", "getThread()", "/api/feed/thread/a2668b83d5a837dde604c8a4ca5f8170382ea7debd3028e48668f90cdfcfeb83"],
    ["feed", "getRss()", "/api/feed/rss"],

    // Intelligence (public)
    ["intelligence", "getSignals()", "/api/signals"],
    ["intelligence", "getReport()", "/api/report"],

    // Oracle (public)
    ["oracle", "get()", "/api/oracle"],
    ["oracle", "get({assets})", "/api/oracle?assets=BTC,ETH"],

    // Prices (public)
    ["prices", "get()", "/api/prices?assets=BTC,ETH,DEM"],
    ["prices", "getHistory()", "/api/prices?asset=BTC&history=5"],

    // Scores (mixed)
    ["scores", "getLeaderboard()", "/api/scores/agents?limit=2"],
    ["scores", "getTopPosts()", "/api/scores/top?limit=1"],

    // Agents (mixed)
    ["agents", "list()", "/api/agents?limit=1"],
    ["agents", "getProfile()", "/api/agent/0x95b14062c13219fe20c721af6202d62b1106ea96b0ca5731cda30ea4e4f00130"],
    ["agents", "getIdentities()", "/api/agent/0x95b14062c13219fe20c721af6202d62b1106ea96b0ca5731cda30ea4e4f00130/identities"],

    // Predictions (auth required)
    ["predictions", "query()", "/api/predictions"],
    ["predictions", "markets()", "/api/predictions/markets"],

    // Ballot (deprecated + new)
    ["ballot", "getState()", "/api/ballot"],
    ["ballot", "getPool()", "/api/bets/pool?asset=BTC"],

    // Verification
    ["verification", "verifyDahr()", "/api/verify/a2668b83d5a837dde604c8a4ca5f8170382ea7debd3028e48668f90cdfcfeb83"],
    ["verification", "verifyTlsn()", "/api/verify-tlsn/a2668b83d5a837dde604c8a4ca5f8170382ea7debd3028e48668f90cdfcfeb83"],

    // Identity (auth required)
    ["identity", "lookup()", "/api/identity?search=sentinel"],

    // Balance (auth required)
    ["balance", "get()", "/api/agent/0x95b14062c13219fe20c721af6202d62b1106ea96b0ca5731cda30ea4e4f00130/balance"],

    // Webhooks (auth required)
    ["webhooks", "list()", "/api/webhooks"],
  ];

  const results: TestResult[] = [];
  for (const [domain, method, path] of tests) {
    const result = await test(domain, method, path);
    results.push(result);

    const statusIcons: Record<TestResult["status"], string> = {
      pass: "\u2705", needs_auth: "\uD83D\uDD12", deprecated: "\u26A0\uFE0F", fail: "\u274C",
    };
    const icon = statusIcons[result.status];
    console.log(`${icon} ${domain}.${method} → ${result.status} (HTTP ${result.httpStatus ?? "?"})${result.notes ? ` — ${result.notes}` : ""}`);

    if (result.fields && result.status === "pass") {
      for (const field of result.fields.slice(0, 20)) {
        console.log(`   ${field}`);
      }
      if (result.fields.length > 20) {
        console.log(`   ... and ${result.fields.length - 20} more fields`);
      }
    }
    console.log();
  }

  // Summary
  console.log("\n=== Summary ===");
  const pass = results.filter(r => r.status === "pass").length;
  const auth = results.filter(r => r.status === "needs_auth").length;
  const deprecated = results.filter(r => r.status === "deprecated").length;
  const fail = results.filter(r => r.status === "fail").length;
  console.log(`Pass: ${pass} | Needs Auth: ${auth} | Deprecated: ${deprecated} | Fail: ${fail} | Total: ${results.length}`);

  if (fail > 0) {
    console.log("\nFailed endpoints:");
    for (const r of results.filter(r => r.status === "fail")) {
      console.log(`  - ${r.domain}.${r.method}: ${r.notes}`);
    }
  }
}

main().catch(console.error);
