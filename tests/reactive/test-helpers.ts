import type { MentionPost } from "../../src/reactive/event-sources/social-mentions.js";
import type { ReplyPost } from "../../src/reactive/event-sources/social-replies.js";
import type { TipRecord } from "../../src/reactive/event-sources/tip-received.js";
import type { DisagreePost } from "../../src/reactive/event-sources/disagree-monitor.js";
import type { ProtocolEvent } from "../../src/reactive/event-sources/protocol-events.js";
import type { ServiceStatus } from "../../src/reactive/event-sources/status-monitor.js";
import type { SSEPost } from "../../src/reactive/event-sources/sse-feed.js";

export function makeReply(overrides: Partial<ReplyPost> = {}): ReplyPost {
  return {
    txHash: "tx-reply-1",
    author: "0xABCDEF1234567890",
    timestamp: 1_000,
    text: "This is a substantive reply with enough detail to cross the threshold.",
    replyTo: "tx-own-1",
    ...overrides,
  };
}

export function makeMention(overrides: Partial<MentionPost> = {}): MentionPost {
  return {
    txHash: "tx-mention-1",
    author: "0xMENTIONER",
    timestamp: 2_000,
    text: "/ask @0xagentaddress What is the best staking strategy?",
    ...overrides,
  };
}

export function makeTip(overrides: Partial<TipRecord> = {}): TipRecord {
  return {
    txHash: "tx-tip-1",
    from: "0xTIPPER",
    amount: 5,
    timestamp: 3_000,
    ...overrides,
  };
}

export function makeDisagreePost(overrides: Partial<DisagreePost> = {}): DisagreePost {
  return {
    txHash: "tx-disagree-1",
    timestamp: 4_000,
    text: "Hot take: this protocol is overvalued.",
    agreeCount: 2,
    disagreeCount: 5,
    disagreeRatio: 0.71,
    ...overrides,
  };
}

export function makeProtocolEvent(overrides: Partial<ProtocolEvent> = {}): ProtocolEvent {
  return {
    id: "event-1",
    protocol: "demo-protocol",
    type: "exploit",
    timestamp: 5_000,
    data: { change: "critical" },
    ...overrides,
  };
}

export function makeServiceStatus(overrides: Partial<ServiceStatus> = {}): ServiceStatus {
  return {
    id: "service-1",
    service: "api",
    status: "healthy",
    timestamp: 6_000,
    latencyMs: 120,
    details: "ok",
    ...overrides,
  };
}

export function makeSSEPost(overrides: Partial<SSEPost> = {}): SSEPost {
  return {
    txHash: "tx-sse-1",
    author: "0xPOSTER",
    timestamp: 7_000,
    text: "hello from sse",
    category: "news",
    assets: [],
    tags: [],
    ...overrides,
  };
}

export function makeTextStream(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}
