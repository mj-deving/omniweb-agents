/**
 * Tests for omniweb-action-executor — extended action handling.
 *
 * Tests the 8 new omniweb action types with mocked context.
 */

import { describe, it, expect, vi } from "vitest";
import { createOmniwebExecutor, type OmniwebExecutorContext } from "../tools/lib/omniweb-action-executor.js";
import type { AgentEvent, EventAction } from "../core/types.js";

// ── Fixtures ────────────────────────────────────────

function makeEvent(overrides: Partial<AgentEvent> = {}): AgentEvent {
  return {
    id: "test:omniweb:1000:evt-1",
    sourceId: "test-source",
    type: "storage_update",
    detectedAt: 1000,
    payload: {},
    watermark: {},
    ...overrides,
  };
}

function makeAction(type: string, params: Record<string, unknown> = {}): EventAction {
  return { type: type as any, params };
}

function createMockCtx(overrides: Partial<OmniwebExecutorContext> = {}): OmniwebExecutorContext {
  return {
    agentName: "nexus-test",
    address: "0xNexus",
    dryRun: false,
    getToken: vi.fn().mockResolvedValue("token"),
    dailyReactive: 4,
    hourlyReactive: 2,
    calibrationOffset: 0,
    personaMdPath: "/tmp/persona.md",
    strategyYamlPath: "/tmp/strategy.yaml",
    llm: null,
    ownTxHashes: new Set(),
    apiCall: vi.fn().mockResolvedValue({ ok: true }),
    generatePost: vi.fn(),
    attestAndPublish: vi.fn(),
    transfer: vi.fn(),
    loadWriteRateLedger: vi.fn().mockReturnValue({
      address: "0xNexus", dailyWindowStart: "2026-03-18",
      hourlyWindowStart: new Date().toISOString(), dailyCount: 0, hourlyCount: 0, entries: [],
    }),
    canPublish: vi.fn().mockReturnValue({ allowed: true }),
    recordPublish: vi.fn().mockImplementation((l) => l),
    saveWriteRateLedger: vi.fn(),
    observe: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    // Omniweb extensions
    storageClient: {
      deriveStateAddress: vi.fn().mockReturnValue("stor-test"),
      createStatePayload: vi.fn().mockReturnValue({}),
      writeStatePayload: vi.fn().mockReturnValue({}),
      setFieldPayload: vi.fn().mockReturnValue({}),
      appendItemPayload: vi.fn().mockReturnValue({}),
      deleteFieldPayload: vi.fn().mockReturnValue({}),
      readState: vi.fn().mockResolvedValue(null),
      readField: vi.fn().mockResolvedValue(null),
      hasField: vi.fn().mockResolvedValue(false),
      listPrograms: vi.fn().mockResolvedValue([]),
      searchPrograms: vi.fn().mockResolvedValue([]),
      validateSize: vi.fn().mockReturnValue(true),
      calculateFee: vi.fn().mockReturnValue(1n),
    } as any,
    budgetTracker: {
      canAfford: vi.fn().mockReturnValue(true),
      recordSpend: vi.fn().mockReturnValue(true),
      recordIncome: vi.fn(),
    } as any,
    transferDem: vi.fn().mockResolvedValue({ hash: "tx-transfer" }),
    attestUrl: vi.fn().mockResolvedValue({ txHash: "tx-attest", responseHash: "hash123" }),
    ...overrides,
  };
}

// ════════════════════════════════════════════════════
// SC action delegation
// ════════════════════════════════════════════════════

describe("omniweb executor — SC delegation", () => {
  it("delegates publish to SC executor", async () => {
    const scExec = vi.fn();
    const ctx = createMockCtx();
    const exec = createOmniwebExecutor(ctx, scExec);

    await exec(makeEvent(), makeAction("publish", { text: "test" }));
    expect(scExec).toHaveBeenCalled();
  });

  it("delegates react to SC executor", async () => {
    const scExec = vi.fn();
    const exec = createOmniwebExecutor(createMockCtx(), scExec);

    await exec(makeEvent(), makeAction("react", { txHash: "tx1", reaction: "agree" }));
    expect(scExec).toHaveBeenCalled();
  });

  it("delegates log_only to SC executor", async () => {
    const scExec = vi.fn();
    const exec = createOmniwebExecutor(createMockCtx(), scExec);

    await exec(makeEvent(), makeAction("log_only", { reason: "test" }));
    expect(scExec).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════
// store action
// ════════════════════════════════════════════════════

describe("omniweb executor — store", () => {
  it("calls setFieldPayload for set_field operation", async () => {
    const ctx = createMockCtx();
    const exec = createOmniwebExecutor(ctx, vi.fn());

    await exec(makeEvent(), makeAction("store", {
      operation: "set_field",
      storageAddress: "stor-abc",
      field: "status",
      value: "active",
    }));

    expect(ctx.storageClient!.setFieldPayload).toHaveBeenCalledWith("stor-abc", "status", "active");
  });

  it("warns when storage client missing", async () => {
    const ctx = createMockCtx({ storageClient: undefined });
    const exec = createOmniwebExecutor(ctx, vi.fn());

    await exec(makeEvent(), makeAction("store", { operation: "write" }));
    expect(ctx.warn).toHaveBeenCalledWith(expect.stringContaining("No storage client"));
  });
});

// ════════════════════════════════════════════════════
// transfer action
// ════════════════════════════════════════════════════

describe("omniweb executor — transfer", () => {
  it("calls transferDem with correct params", async () => {
    const ctx = createMockCtx();
    const exec = createOmniwebExecutor(ctx, vi.fn());

    await exec(makeEvent(), makeAction("transfer", { to: "demos1dest", amount: 10 }));
    expect(ctx.transferDem).toHaveBeenCalledWith("demos1dest", 10);
  });

  it("checks budget before transfer", async () => {
    const ctx = createMockCtx({
      budgetTracker: {
        canAfford: vi.fn().mockReturnValue(false),
        recordSpend: vi.fn(),
        recordIncome: vi.fn(),
      } as any,
    });
    const exec = createOmniwebExecutor(ctx, vi.fn());

    await exec(makeEvent(), makeAction("transfer", { to: "dest", amount: 500 }));
    expect(ctx.transferDem).not.toHaveBeenCalled();
    expect(ctx.warn).toHaveBeenCalledWith(expect.stringContaining("budget insufficient"));
  });

  it("records spend after successful transfer", async () => {
    const ctx = createMockCtx();
    const exec = createOmniwebExecutor(ctx, vi.fn());

    await exec(makeEvent(), makeAction("transfer", { to: "dest", amount: 5 }));
    expect(ctx.budgetTracker!.recordSpend).toHaveBeenCalledWith("operations", 5, expect.any(String));
  });
});

// ════════════════════════════════════════════════════
// attest action
// ════════════════════════════════════════════════════

describe("omniweb executor — attest", () => {
  it("calls attestUrl with URL", async () => {
    const ctx = createMockCtx();
    const exec = createOmniwebExecutor(ctx, vi.fn());

    await exec(makeEvent(), makeAction("attest", { url: "https://api.example.com/data" }));
    expect(ctx.attestUrl).toHaveBeenCalledWith("https://api.example.com/data", "GET");
  });

  it("records attestation spend", async () => {
    const ctx = createMockCtx();
    const exec = createOmniwebExecutor(ctx, vi.fn());

    await exec(makeEvent(), makeAction("attest", { url: "https://api.example.com" }));
    expect(ctx.budgetTracker!.recordSpend).toHaveBeenCalledWith("attestation", 1, expect.any(String));
  });
});

// ════════════════════════════════════════════════════
// blocked actions
// ════════════════════════════════════════════════════

describe("omniweb executor — blocked actions", () => {
  const blockedTypes = ["bridge", "workflow", "private_transfer", "zk_prove"];

  it.each(blockedTypes)("blocks %s with warning", async (type) => {
    const ctx = createMockCtx();
    const exec = createOmniwebExecutor(ctx, vi.fn());

    await exec(makeEvent(), makeAction(type));
    expect(ctx.warn).toHaveBeenCalledWith(expect.stringContaining("BLOCKED"));
  });
});

// ════════════════════════════════════════════════════
// assign_task action
// ════════════════════════════════════════════════════

describe("omniweb executor — assign_task", () => {
  it("appends task to storage", async () => {
    const ctx = createMockCtx();
    const exec = createOmniwebExecutor(ctx, vi.fn());

    await exec(makeEvent(), makeAction("assign_task", {
      taskId: "task-1",
      storageAddress: "stor-tasks",
      assignee: "nexus",
      task: { type: "attest", params: { url: "https://data.source" } },
    }));

    expect(ctx.storageClient!.appendItemPayload).toHaveBeenCalledWith(
      "stor-tasks",
      "tasks",
      expect.objectContaining({ taskId: "task-1", status: "pending" }),
    );
  });
});

// ════════════════════════════════════════════════════
// dry-run
// ════════════════════════════════════════════════════

describe("omniweb executor — dry-run", () => {
  it("skips omniweb actions in dry-run", async () => {
    const ctx = createMockCtx({ dryRun: true });
    const exec = createOmniwebExecutor(ctx, vi.fn());

    await exec(makeEvent(), makeAction("store", { operation: "write" }));
    expect(ctx.info).toHaveBeenCalledWith(expect.stringContaining("[dry-run]"));
    expect(ctx.storageClient!.writeStatePayload).not.toHaveBeenCalled();
  });
});
