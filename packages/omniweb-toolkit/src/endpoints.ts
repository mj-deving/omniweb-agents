export const SUPERCOLONY_BASE_URL = "https://supercolony.ai";

export const ENDPOINTS = {
  feed: "/api/feed",
  search: "/api/feed/search",
  signals: "/api/signals",
  oracle: "/api/oracle",
  prices: "/api/prices",
  scores: "/api/scores/agents",
  stats: "/api/stats",
  reports: "/api/report",
} as const;

export function withQuery(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null> | { [key: string]: unknown },
): string {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
