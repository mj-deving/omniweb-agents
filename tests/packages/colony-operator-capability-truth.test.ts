import { describe, expect, it } from "vitest";
import { buildColonyOperatorCapabilityTruth } from "../../packages/omniweb-toolkit/src/colony-operator-capability-truth.js";
import { describeRuntimeCapabilities } from "../../packages/omniweb-toolkit/src/readiness.js";

describe("colony operator capability truth", () => {
  it("covers every MegaGoal operator family without overclaiming higher/lower", () => {
    const runtime = describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} });
    const truth = buildColonyOperatorCapabilityTruth({
      runtimeCapabilities: {
        ...runtime,
        actionFamilies: {
          ...runtime.actionFamilies,
          publish: { ...runtime.actionFamilies.publish, readiness: "ready" },
          reply: { ...runtime.actionFamilies.reply, readiness: "ready" },
          react: { ...runtime.actionFamilies.react, readiness: "ready" },
          tip: { ...runtime.actionFamilies.tip, readiness: "ready" },
          bet: { ...runtime.actionFamilies.bet, readiness: "ready" },
        },
      },
      now: new Date("2026-05-16T10:00:00.000Z"),
    });

    expect(truth.coverage.allRequiredFamiliesPresent).toBe(true);
    expect(truth.coverage.requiredFamilies).toEqual([
      "skip",
      "publish",
      "reply",
      "react",
      "tip",
      "VOTE",
      "bet-fixed",
      "bet-hl",
      "register",
      "human-link",
    ]);
    expect(truth.actions.find((action) => action.actionFamily === "VOTE")).toMatchObject({
      status: "executable",
      runtimeFamily: "publish",
      executionPathFamily: "vote_publish",
      writesLifecycleRecord: true,
      lifecycleStatus: "indexed",
    });
    expect(truth.actions.find((action) => action.actionFamily === "bet-fixed")).toMatchObject({
      status: "executable",
      runtimeFamily: "bet",
      lifecycleStatus: "resolved",
    });
    expect(truth.actions.find((action) => action.actionFamily === "bet-hl")).toMatchObject({
      status: "lifecycle-pending",
      lifecycleStatus: "lifecycle-pending",
      reasonCodes: ["higher_lower_current_delayed_readback_pending"],
    });
  });

  it("reports identity as honest blocked or supervised state without secrets", () => {
    const blocked = buildColonyOperatorCapabilityTruth({
      cwd: "/tmp",
      homeDir: "/tmp",
      env: {},
      now: new Date("2026-05-16T10:00:00.000Z"),
    });
    expect(blocked.actions.find((action) => action.actionFamily === "register")).toMatchObject({
      status: "blocked",
      runtimeFamily: "identity",
      requiresExplicitExecute: true,
      reasonCodes: ["missing_credentials"],
    });

    const runtime = describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} });
    const supervised = buildColonyOperatorCapabilityTruth({
      runtimeCapabilities: {
        ...runtime,
        authReady: true,
        blockers: [],
        readiness: {
          ...runtime.readiness,
          canAuth: true,
          missingEnv: [],
        },
      },
    });

    expect(supervised.actions.find((action) => action.actionFamily === "human-link")).toMatchObject({
      status: "supervised",
      runtimeFamily: "identity",
      requiresExplicitExecute: true,
      spendsDem: false,
      reasonCodes: ["identity_mutation_requires_explicit_execute"],
    });
    expect(JSON.stringify(supervised)).not.toMatch(/mnemonic|challengeSecret|approvalToken/i);
  });
});

