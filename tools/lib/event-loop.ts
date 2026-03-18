/**
 * EventLoop — poll-diff-filter-dispatch-save orchestrator.
 *
 * Manages multiple EventSources, dispatches events to EventHandlers,
 * persists watermarks, and implements adaptive polling with backoff.
 *
 * Process model: long-lived process managed by systemd/pm2.
 * Cron loop continues unchanged — this runs alongside it.
 *
 * WS4: SuperColony Reactive Mode infrastructure.
 */

import type {
  AgentEvent,
  EventAction,
  EventSource,
  EventHandler,
  WatermarkStore,
} from "../../core/types.js";

// ── Types ──────────────────────────────────────────

export interface EventLoopConfig {
  /** Agent name (for logging) */
  agent: string;
  /** Graceful shutdown period in ms (default: 5000) */
  shutdownGracePeriodMs?: number;
}

export interface SourceRegistration<T = unknown> {
  source: EventSource<T>;
  /** Base polling interval in ms */
  intervalMs: number;
  /** Minimum interval (floor) in ms */
  minIntervalMs?: number;
  /** Maximum interval (ceiling) in ms */
  maxIntervalMs?: number;
  /** Backoff multiplier when no events detected (default: 1.5) */
  backoffFactor?: number;
}

export interface EventLoopStats {
  /** Total events detected since start */
  totalEvents: number;
  /** Total actions dispatched since start */
  totalActions: number;
  /** Total handler errors since start */
  totalErrors: number;
  /** Events per source */
  eventsBySource: Record<string, number>;
  /** Current adaptive interval per source (ms) */
  currentIntervals: Record<string, number>;
}

// ── Adaptive Interval ──────────────────────────────

export interface AdaptiveInterval {
  current: number;
  base: number;
  min: number;
  max: number;
  backoffFactor: number;
  consecutiveEmpty: number;
}

/**
 * Calculate next interval based on whether events were found.
 */
export function nextInterval(state: AdaptiveInterval, hadEvents: boolean): AdaptiveInterval {
  if (hadEvents) {
    return { ...state, current: state.base, consecutiveEmpty: 0 };
  }
  const newEmpty = state.consecutiveEmpty + 1;
  const raw = state.base * Math.pow(state.backoffFactor, newEmpty);
  const clamped = Math.min(state.max, Math.max(state.min, raw));
  return { ...state, current: clamped, consecutiveEmpty: newEmpty };
}

// ── Event Loop ─────────────────────────────────────

export interface RunningEventLoop {
  /** Gracefully stop the loop */
  stop(): Promise<void>;
  /** Get current stats */
  stats(): EventLoopStats;
}

/**
 * Create and start an event loop.
 *
 * The loop polls sources at their configured intervals,
 * diffs snapshots against prior state, dispatches events to
 * matching handlers, and persists watermarks.
 *
 * On startup, watermarks are loaded from the store to seed
 * snapshot state, preventing duplicate event processing on restart.
 */
export function startEventLoop(
  config: EventLoopConfig,
  sources: SourceRegistration[],
  handlers: EventHandler[],
  store: WatermarkStore,
  onAction: (event: AgentEvent, action: EventAction) => Promise<unknown>,
  onError?: (event: AgentEvent, error: Error) => void,
): RunningEventLoop {
  let running = true;

  // One timer per source — replaced on each poll cycle (no unbounded growth)
  const activeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  const stats: EventLoopStats = {
    totalEvents: 0,
    totalActions: 0,
    totalErrors: 0,
    eventsBySource: {},
    currentIntervals: {},
  };

  // Adaptive intervals per source
  const intervals: Record<string, AdaptiveInterval> = {};

  // Previous snapshots (in-memory cache, seeded from store on first poll)
  const snapshots: Record<string, unknown> = {};
  // Track whether we've seeded from the store for each source
  const seeded: Set<string> = new Set();

  for (const reg of sources) {
    const min = reg.minIntervalMs ?? Math.max(10_000, reg.intervalMs * 0.5);
    const max = reg.maxIntervalMs ?? Math.max(reg.intervalMs * 10, 900_000);
    intervals[reg.source.id] = {
      current: reg.intervalMs,
      base: reg.intervalMs,
      min,
      max,
      backoffFactor: reg.backoffFactor ?? 1.5,
      consecutiveEmpty: 0,
    };
    stats.eventsBySource[reg.source.id] = 0;
    stats.currentIntervals[reg.source.id] = reg.intervalMs;
  }

  /** Poll a single source, diff, dispatch, save watermark. */
  async function pollSource<T>(reg: SourceRegistration<T>): Promise<void> {
    if (!running) return;

    const src = reg.source;
    try {
      // Seed snapshot from watermark store on first poll (prevents duplicates on restart)
      if (!seeded.has(src.id)) {
        const savedWatermark = await store.load(src.id);
        if (savedWatermark !== null) {
          // Use watermark as a sentinel — the first poll will diff against null
          // but we mark as seeded so the source knows we're not fresh
          snapshots[src.id] = savedWatermark;
        }
        seeded.add(src.id);
      }

      const curr = await src.poll();
      const prev = (snapshots[src.id] as T | undefined) ?? null;
      const events = src.diff(prev, curr);

      snapshots[src.id] = curr;

      // Dispatch events to matching handlers
      for (const event of events) {
        stats.totalEvents++;
        stats.eventsBySource[src.id] = (stats.eventsBySource[src.id] || 0) + 1;

        for (const handler of handlers) {
          if (!handler.eventTypes.includes(event.type)) continue;

          try {
            const action = await handler.handle(event);
            if (action) {
              stats.totalActions++;
              await onAction(event, action);
            }
          } catch (err) {
            stats.totalErrors++;
            onError?.(event, err instanceof Error ? err : new Error(String(err)));
          }
        }
      }

      // Save watermark (only when events were found, to avoid unnecessary I/O)
      if (events.length > 0) {
        const watermark = src.extractWatermark(curr);
        await store.save(src.id, watermark);
      }

      // Update adaptive interval
      const hadEvents = events.length > 0;
      intervals[src.id] = nextInterval(intervals[src.id], hadEvents);
      stats.currentIntervals[src.id] = intervals[src.id].current;

    } catch (err) {
      // Source-level error — don't crash the loop
      const dummyEvent: AgentEvent = {
        id: `error:${src.id}:${Date.now()}`,
        sourceId: src.id,
        type: "poll_error",
        detectedAt: Date.now(),
        payload: null,
        watermark: null,
      };
      stats.totalErrors++;
      onError?.(dummyEvent, err instanceof Error ? err : new Error(String(err)));
    }

    // Schedule next poll (replaces previous timer for this source)
    if (running) {
      const timer = setTimeout(() => pollSource(reg), intervals[src.id].current);
      activeTimers.set(src.id, timer);
    }
  }

  // Start polling all sources
  for (const reg of sources) {
    // Stagger initial polls slightly to avoid thundering herd
    // Jitter is at most half the interval or 2s, whichever is smaller
    const jitter = Math.random() * Math.min(reg.intervalMs * 0.5, 2000);
    const timer = setTimeout(() => pollSource(reg), jitter);
    activeTimers.set(reg.source.id, timer);
  }

  return {
    async stop(): Promise<void> {
      running = false;
      for (const t of activeTimers.values()) clearTimeout(t);
      activeTimers.clear();
      // Wait for graceful shutdown period
      const grace = config.shutdownGracePeriodMs ?? 5000;
      await new Promise(resolve => setTimeout(resolve, Math.min(grace, 1000)));
    },
    stats(): EventLoopStats {
      return {
        ...stats,
        eventsBySource: { ...stats.eventsBySource },
        currentIntervals: { ...stats.currentIntervals },
      };
    },
  };
}
