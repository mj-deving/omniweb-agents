import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildWriteLifecycleProofPacket,
  classifyLifecycleStatus,
  createWriteLifecycleStore,
  finalVerdictForStatus,
} from "../../packages/omniweb-toolkit/scripts/_write-lifecycle";

describe("write lifecycle store", () => {
  it("persists non-secret pending records and finds them by tx hash", async () => {
    const stateDir = await mkdtemp(join(tmpdir(), "write-lifecycle-"));
    const store = createWriteLifecycleStore({ stateDir });

    const record = await store.create({
      actionFamily: "bet-fixed",
      walletAddress: "0xabc",
      command: "probe-agentic-memo-bet --check-tx tx-1",
      commit: "abc123",
      budget: { amount: 5, unit: "DEM", ceiling: 5, spendStatus: "executed" },
      txHash: "tx-1",
      asset: "BTC",
      horizon: "30m",
      predictedPrice: 90000,
      expectedReadback: ["chain-rpc", "active-pool", "winners-history"],
      metadata: {
        authToken: "must-not-persist",
        nested: { DEMOS_MNEMONIC: "must-not-persist" },
      },
    });

    const found = await store.get("tx-1");
    expect(found?.id).toBe(record.id);
    expect(found?.metadata).toMatchObject({
      authToken: "[redacted]",
      nested: { DEMOS_MNEMONIC: "[redacted]" },
    });
  });

  it("records transitions, observations, and proof packets", async () => {
    const stateDir = await mkdtemp(join(tmpdir(), "write-lifecycle-"));
    const store = createWriteLifecycleStore({ stateDir });
    const record = await store.create({
      actionFamily: "vote",
      walletAddress: "0xabc",
      txHash: "vote-tx",
      attestationTxHash: "attest-tx",
      budget: { unit: "write-rate-slot", amount: 1, spendStatus: "executed" },
      expectedReadback: ["chain-rpc", "category-search"],
    });

    const updated = await store.update(record.id, {
      status: "indexed",
      transitionReason: "VOTE search readback found tx",
      observation: {
        surface: "category-search",
        status: "indexed",
        ok: true,
        summary: "search({ category: VOTE }) matched vote-tx",
        data: { txHash: "vote-tx", blockNumber: 2264809 },
      },
      finalVerdict: {
        verdict: "pass",
        rationale: "VOTE indexed through category search",
        at: new Date().toISOString(),
      },
    });
    const packet = buildWriteLifecycleProofPacket(updated);
    const out = await store.writeProofPacket(updated, packet);
    const raw = await readFile(out, "utf8");

    expect(updated.transitions).toEqual([
      expect.objectContaining({ from: "broadcasted", to: "indexed" }),
    ]);
    expect(packet.productReadbackState).toHaveLength(1);
    expect(JSON.parse(raw)).toMatchObject({
      recordId: record.id,
      status: "indexed",
      finalVerdict: { verdict: "pass" },
    });
  });
});

describe("write lifecycle classification", () => {
  it("uses the shared lifecycle vocabulary order", () => {
    expect(classifyLifecycleStatus({ txHash: "tx" })).toBe("pending-chain");
    expect(classifyLifecycleStatus({ txHash: "tx", chainConfirmed: true })).toBe("pending-indexer");
    expect(classifyLifecycleStatus({ indexed: true })).toBe("indexed");
    expect(classifyLifecycleStatus({ resolved: true })).toBe("resolved");
    expect(classifyLifecycleStatus({ degraded: true })).toBe("degraded");
    expect(classifyLifecycleStatus({ expired: true })).toBe("expired");
    expect(classifyLifecycleStatus({ failed: true })).toBe("failed");
  });

  it("maps terminal statuses to proof verdicts", () => {
    expect(finalVerdictForStatus("resolved")).toBe("pass");
    expect(finalVerdictForStatus("indexed")).toBe("pass");
    expect(finalVerdictForStatus("degraded")).toBe("degraded");
    expect(finalVerdictForStatus("pending-indexer")).toBeNull();
  });
});
