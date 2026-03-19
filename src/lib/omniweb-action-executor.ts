/**
 * Omniweb Action Executor — extends the SC action executor with omniweb action types.
 *
 * Composes with createActionExecutor: SC actions (publish, reply, react, tip, log_only)
 * are delegated to the existing executor. New omniweb types (store, transfer, attest,
 * bridge, workflow, assign_task, private_transfer, zk_prove) are handled here.
 *
 * SDK-free — all SDK calls are injected via context closures.
 */

import type { AgentEvent, EventAction, OmniwebActionType, StoreParams, TransferParams, AttestParams } from "../types.js";
import { toErrorMessage } from "./errors.js";
import type { ActionExecutorContext } from "./action-executor.js";
import type { StorageClient } from "./storage-client.js";
import type { BudgetTracker } from "./budget-tracker.js";

// ── Extended Context ────────────────────────────────

export interface OmniwebExecutorContext extends ActionExecutorContext {
  /** Storage client for on-chain state operations */
  storageClient?: StorageClient;
  /** Budget tracker for spending decisions */
  budgetTracker?: BudgetTracker;
  /** DEM transfer function (demos.transfer wrapper) */
  transferDem?: (to: string, amount: number) => Promise<unknown>;
  /** Standalone attestation function (attestDahr wrapper) */
  attestUrl?: (url: string, method?: string) => Promise<{ txHash: string; responseHash: string }>;
}

// ── SC Action Types (handled by existing executor) ──

const SC_ACTIONS = new Set(["publish", "reply", "react", "tip", "log_only"]);

// ── Blocked Actions (SDK issues) ────────────────────

const BLOCKED_ACTIONS: Record<string, string> = {
  bridge: "XM SDK cross-chain operations untested — deferred until validated",
  workflow: "DemosWork has ESM directory import bug — blocked until SDK fix",
  private_transfer: "L2PS encryptTx fails in Node.js (Buffer polyfill) — blocked until SDK fix",
  zk_prove: "ZK proof generation not yet implemented in SDK",
};

// ── Factory ─────────────────────────────────────────

/**
 * Create an omniweb action executor that handles all 13 action types.
 *
 * @param ctx — extended context with omniweb dependencies
 * @param scExecutor — the existing SC executor (handles 5 SC types)
 */
export function createOmniwebExecutor(
  ctx: OmniwebExecutorContext,
  scExecutor: (event: AgentEvent, action: EventAction) => Promise<void>,
): (event: AgentEvent, action: EventAction) => Promise<void> {

  return async (event: AgentEvent, action: EventAction): Promise<void> => {
    // Delegate SC actions to existing executor
    if (SC_ACTIONS.has(action.type)) {
      return scExecutor(event, action);
    }

    // Observe all omniweb actions
    ctx.observe("insight", `Omniweb action: ${action.type}`, {
      phase: "event-loop",
      source: `omniweb-executor:${event.sourceId}`,
      data: { eventId: event.id, action },
    });

    // Dry-run guard
    if (ctx.dryRun) {
      ctx.info(`[dry-run] Would execute omniweb: ${action.type} ${JSON.stringify(action.params)}`);
      return;
    }

    // Check for blocked actions
    const blockedReason = BLOCKED_ACTIONS[action.type];
    if (blockedReason) {
      ctx.warn(`[omniweb] ${action.type} BLOCKED: ${blockedReason}`);
      ctx.observe("warning", `Blocked action: ${action.type}`, {
        phase: "event-loop",
        source: "omniweb-executor:blocked",
        data: { type: action.type, reason: blockedReason },
      });
      return;
    }

    // Handle omniweb action types
    switch (action.type) {
      case "store": {
        const params = action.params as unknown as StoreParams;
        ctx.info(`[omniweb] Store: ${params.operation} ${params.storageAddress || params.programName || ""}`);
        try {
          if (!ctx.storageClient) {
            ctx.warn("[omniweb] No storage client available — cannot execute store action");
            break;
          }

          // Budget check for storage writes
          if (ctx.budgetTracker && params.operation === "create") {
            const data = (params.data || {}) as Record<string, unknown>;
            const fee = Number(ctx.storageClient.calculateFee(data));
            if (!ctx.budgetTracker.canAfford("storage", fee)) {
              ctx.warn(`[omniweb] Storage budget insufficient for ${fee} DEM`);
              break;
            }
            ctx.budgetTracker.recordSpend("storage", fee, `create: ${params.programName}`);
          }

          // Generate payload (actual submission is runner's responsibility)
          let payload: unknown;
          switch (params.operation) {
            case "create":
              payload = ctx.storageClient.createStatePayload(
                (params.data || {}) as Record<string, unknown>,
                Date.now(), // nonce
                (params.acl as "public" | "private") || "public",
              );
              break;
            case "write":
              payload = ctx.storageClient.writeStatePayload(
                params.storageAddress!,
                (params.data || {}) as Record<string, unknown>,
              );
              break;
            case "set_field":
              payload = ctx.storageClient.setFieldPayload(
                params.storageAddress!,
                params.field!,
                params.value,
              );
              break;
            case "append_item":
              payload = ctx.storageClient.appendItemPayload(
                params.storageAddress!,
                params.field!,
                params.value,
              );
              break;
            case "delete_field":
              payload = ctx.storageClient.deleteFieldPayload(
                params.storageAddress!,
                params.field!,
              );
              break;
          }

          ctx.observe("insight", `Storage ${params.operation} payload created`, {
            phase: "event-loop",
            source: "omniweb-executor:store",
            data: { operation: params.operation, hasPayload: !!payload },
          });
        } catch (err) {
          const msg = toErrorMessage(err);
          ctx.warn(`[omniweb] Store error: ${msg}`);
          ctx.observe("failure", `Store failed: ${msg}`, {
            phase: "event-loop",
            source: "omniweb-executor:store",
            data: { operation: params.operation, error: msg },
          });
        }
        break;
      }

      case "transfer": {
        const params = action.params as unknown as TransferParams;
        ctx.info(`[omniweb] Transfer ${params.amount} DEM to ${params.to}`);
        try {
          if (!ctx.transferDem) {
            ctx.warn("[omniweb] No transfer function available");
            break;
          }

          // Budget check
          if (ctx.budgetTracker && !ctx.budgetTracker.canAfford("operations", params.amount)) {
            ctx.warn(`[omniweb] Operations budget insufficient for ${params.amount} DEM transfer`);
            break;
          }

          const result = await ctx.transferDem(params.to, params.amount);
          ctx.budgetTracker?.recordSpend("operations", params.amount, `transfer to ${params.to}`);

          ctx.observe("insight", `Transferred ${params.amount} DEM to ${params.to}`, {
            phase: "event-loop",
            source: "omniweb-executor:transfer",
            data: { to: params.to, amount: params.amount, result },
          });
        } catch (err) {
          const msg = toErrorMessage(err);
          ctx.warn(`[omniweb] Transfer error: ${msg}`);
          ctx.observe("failure", `Transfer failed: ${msg}`, {
            phase: "event-loop",
            source: "omniweb-executor:transfer",
            data: { to: params.to, amount: params.amount, error: msg },
          });
        }
        break;
      }

      case "attest": {
        const params = action.params as unknown as AttestParams;
        ctx.info(`[omniweb] Attest: ${params.url} via ${params.method || "dahr"}`);
        try {
          if (!ctx.attestUrl) {
            ctx.warn("[omniweb] No attestation function available");
            break;
          }

          // Budget check
          const attestCost = params.method === "tlsn" ? 12 : 1; // DEM
          if (ctx.budgetTracker && !ctx.budgetTracker.canAfford("attestation", attestCost)) {
            ctx.warn(`[omniweb] Attestation budget insufficient for ${attestCost} DEM`);
            break;
          }

          const result = await ctx.attestUrl(params.url, params.method === "tlsn" ? "GET" : "GET");
          ctx.budgetTracker?.recordSpend("attestation", attestCost, `attest ${params.url}`);

          // Optionally store proof in Storage Program
          if (params.storeProof && ctx.storageClient && params.storageAddress) {
            ctx.storageClient.appendItemPayload(params.storageAddress, "attestations", {
              url: params.url,
              txHash: result.txHash,
              responseHash: result.responseHash,
              timestamp: new Date().toISOString(),
            });
          }

          ctx.observe("insight", `Attested ${params.url} → txHash ${result.txHash}`, {
            phase: "event-loop",
            source: "omniweb-executor:attest",
            data: { url: params.url, txHash: result.txHash },
          });
        } catch (err) {
          const msg = toErrorMessage(err);
          ctx.warn(`[omniweb] Attest error: ${msg}`);
          ctx.observe("failure", `Attest failed: ${msg}`, {
            phase: "event-loop",
            source: "omniweb-executor:attest",
            data: { url: params.url, error: msg },
          });
        }
        break;
      }

      case "assign_task": {
        const taskId = String(action.params.taskId || "");
        const storageAddress = String(action.params.storageAddress || "");
        ctx.info(`[omniweb] Assign task ${taskId} to storage ${storageAddress}`);
        try {
          if (!ctx.storageClient) {
            ctx.warn("[omniweb] No storage client — cannot assign task");
            break;
          }

          const task = action.params.task as Record<string, unknown> | undefined;
          if (!task) {
            ctx.warn("[omniweb] No task payload provided");
            break;
          }

          // Append task to the task queue field
          ctx.storageClient.appendItemPayload(storageAddress, "tasks", {
            taskId,
            assignee: action.params.assignee || "any",
            task,
            assignedAt: new Date().toISOString(),
            status: "pending",
          });

          ctx.observe("insight", `Task ${taskId} assigned`, {
            phase: "event-loop",
            source: "omniweb-executor:assign_task",
            data: { taskId, storageAddress },
          });
        } catch (err) {
          const msg = toErrorMessage(err);
          ctx.warn(`[omniweb] Assign task error: ${msg}`);
          ctx.observe("failure", `Assign task failed: ${msg}`, {
            phase: "event-loop",
            source: "omniweb-executor:assign_task",
            data: { taskId, error: msg },
          });
        }
        break;
      }

      default:
        ctx.warn(`[omniweb] Unknown action type: ${action.type}`);
        break;
    }
  };
}
