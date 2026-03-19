/**
 * Shared mock SkillDojoClient for adapter tests.
 */

import { vi } from "vitest";
import type { SkillDojoClient, SkillDojoResponse } from "../../../src/lib/skill-dojo-client.js";

export function createMockClient(
  overrides?: Partial<SkillDojoClient>,
): SkillDojoClient {
  return {
    execute: vi.fn().mockResolvedValue({
      ok: true,
      skillId: "mock",
      executionTimeMs: 42,
      result: {
        status: "success",
        message: "Mock success",
        data: {},
        timestamp: "2026-03-19T00:00:00Z",
      },
    }),
    canExecute: vi.fn().mockReturnValue(true),
    getRemainingBudget: vi.fn().mockReturnValue({ remaining: 5, resetsAt: Date.now() + 3600000 }),
    ...overrides,
  };
}

export function mockSuccessResponse<T = unknown>(
  skillId: string,
  data: T,
  message = "Success",
): SkillDojoResponse<T> {
  return {
    ok: true,
    skillId,
    executionTimeMs: 123,
    result: {
      status: "success",
      message,
      data,
      timestamp: "2026-03-19T00:00:00Z",
    },
  };
}

export function mockErrorResponse(
  skillId: string,
  error: string,
): SkillDojoResponse {
  return {
    ok: false,
    skillId,
    executionTimeMs: 0,
    error,
  };
}
