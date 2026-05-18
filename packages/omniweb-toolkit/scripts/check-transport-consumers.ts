#!/usr/bin/env npx tsx
/**
 * check-transport-consumers.ts — No-spend proof for auth, RSS, and SSE consumer contracts.
 */

import {
  buildFeedStreamRequestPlan,
  classifyTransportAuth,
  parseServerSentEvents,
  summarizeRssFeed,
} from "../src/index.js";

const rss = summarizeRssFeed(`<?xml version="1.0"?>
<feed>
  <title>SuperColony</title>
  <entry><title>One</title><link href="https://example.test/1" /></entry>
  <entry><title>Two</title><link href="https://example.test/2" /></entry>
</feed>`, "application/atom+xml");
const streamPlan = buildFeedStreamRequestPlan({
  token: "sc_live_secret_token_123456",
  lastEventId: "evt-42",
});
const openedStreamPlan = buildFeedStreamRequestPlan({
  openStream: true,
});
const events = parseServerSentEvents([
  "id: evt-42",
  "event: post",
  "data: {\"txHash\":\"abc\"}",
  "",
  "event: auth_expired",
  "data: {\"reason\":\"expired\"}",
].join("\n"));
const expiredAuth = classifyTransportAuth({
  token: "secret-token",
  status: 401,
  body: { error: "token expired" },
});

const checks = {
  rssTitle: rss.title === "SuperColony",
  rssEntries: rss.entryCount === 2,
  sseDefaultDoesNotOpen: streamPlan.opensStream === false,
  sseReplayHeader: streamPlan.replay.lastEventId === "evt-42",
  sseAuthRedacted: streamPlan.headers.authorization?.includes("[redacted]") === true,
  sseExplicitOpenStillNoSpend: openedStreamPlan.opensStream === true
    && openedStreamPlan.noSpend === true
    && openedStreamPlan.noMutation === true,
  sseEventsParsed: events.length === 2 && events[1]?.event === "auth_expired",
  authExpiredClassified: expiredAuth.state === "expired" && expiredAuth.redactedToken === "secr...[redacted]...oken",
};
const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  checks,
  rss,
  streamPlan,
  openedStreamPlan,
  events,
  expiredAuth,
  contract: {
    ownerBead: "omniweb-agents-spectrum.5",
    noSpend: true,
    noMutation: true,
    opensLongLivedStreamByDefault: false,
  },
}, null, 2));

process.exit(ok ? 0 : 1);
