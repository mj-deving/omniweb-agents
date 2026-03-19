import { describe, it, expect } from "vitest";
import { createMultiStepOperationsAction } from "../../../src/adapters/skill-dojo/multi-step-operations.js";
import { createMockClient } from "./mock-client.js";

describe("createMultiStepOperationsAction (STUB)", () => {
  it("returns an Action with correct name", () => {
    const client = createMockClient();
    const action = createMultiStepOperationsAction({ client });
    expect(action.name).toBe("skill-dojo:multi-step-operations");
  });

  it("validate always returns false", async () => {
    const client = createMockClient();
    const action = createMultiStepOperationsAction({ client });
    expect(await action.validate({ context: { mode: "batch" } })).toBe(false);
    expect(await action.validate({ context: {} })).toBe(false);
  });

  it("execute always returns not-available error", async () => {
    const client = createMockClient();
    const action = createMultiStepOperationsAction({ client });
    const result = await action.execute({ context: { mode: "batch" } });

    expect(result.success).toBe(false);
    expect(result.error).toContain("DemosWork");
    expect(result.error).toContain("ESM bug");
  });

  it("never calls the client", async () => {
    const client = createMockClient();
    const action = createMultiStepOperationsAction({ client });
    await action.execute({ context: {} });
    expect(client.execute).not.toHaveBeenCalled();
  });
});
