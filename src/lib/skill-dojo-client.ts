/**
 * Skill Dojo HTTP client with sliding-window rate limiting.
 *
 * Shared across all agents on the same machine (5 req/hr per IP).
 * Rate state is in-memory — resets on process restart, which is
 * acceptable for cron-driven session loops.
 */

// ── Types ──────────────────────────────────────────

export interface SkillDojoClientConfig {
  baseUrl?: string;
  maxRequestsPerHour?: number;
}

export interface SkillDojoResponse<T = unknown> {
  ok: boolean;
  skillId: string;
  executionTimeMs: number;
  result?: {
    status: string;
    message: string;
    data: T;
    timestamp: string;
  };
  error?: string;
}

export interface SkillDojoClient {
  execute<T = unknown>(
    skillId: string,
    params: Record<string, unknown>,
  ): Promise<SkillDojoResponse<T>>;
  canExecute(): boolean;
  getRemainingBudget(): { remaining: number; resetsAt: number };
}

// ── Implementation ─────────────────────────────────

const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_BASE_URL =
  "https://skillsdojo-production.up.railway.app";
const DEFAULT_MAX_PER_HOUR = 5;

export function createSkillDojoClient(
  config?: SkillDojoClientConfig,
): SkillDojoClient {
  const baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL;
  const maxPerHour = config?.maxRequestsPerHour ?? DEFAULT_MAX_PER_HOUR;
  const timestamps: number[] = [];

  function pruneWindow(): void {
    const cutoff = Date.now() - HOUR_MS;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }
  }

  function canExecute(): boolean {
    pruneWindow();
    return timestamps.length < maxPerHour;
  }

  function getRemainingBudget(): { remaining: number; resetsAt: number } {
    pruneWindow();
    const remaining = Math.max(0, maxPerHour - timestamps.length);
    const resetsAt =
      timestamps.length > 0 ? timestamps[0] + HOUR_MS : Date.now() + HOUR_MS;
    return { remaining, resetsAt };
  }

  async function execute<T = unknown>(
    skillId: string,
    params: Record<string, unknown>,
  ): Promise<SkillDojoResponse<T>> {
    if (!canExecute()) {
      const { resetsAt } = getRemainingBudget();
      throw new Error(
        `Skill Dojo rate limit exceeded (${maxPerHour}/hr). Resets at ${new Date(resetsAt).toISOString()}`,
      );
    }

    timestamps.push(Date.now());

    const res = await fetch(`${baseUrl}/api/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillId, params }),
    });

    if (!res.ok) {
      return {
        ok: false,
        skillId,
        executionTimeMs: 0,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    return (await res.json()) as SkillDojoResponse<T>;
  }

  return { execute, canExecute, getRemainingBudget };
}
