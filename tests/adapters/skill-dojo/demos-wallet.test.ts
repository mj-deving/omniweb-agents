import { describe, it, expect } from "vitest";
import { createDemosWalletAction } from "../../../src/adapters/skill-dojo/demos-wallet.js";
import { createMockClient } from "./mock-client.js";

describe("createDemosWalletAction (STUB)", () => {
  it("returns an Action with correct name", () => {
    const client = createMockClient();
    const action = createDemosWalletAction({ client });
    expect(action.name).toBe("skill-dojo:demos-wallet");
  });

  it("validate always returns false", async () => {
    const client = createMockClient();
    const action = createDemosWalletAction({ client });
    expect(await action.validate({ context: { mode: "connect" } })).toBe(false);
    expect(await action.validate({ context: {} })).toBe(false);
  });

  it("execute always returns browser-only error", async () => {
    const client = createMockClient();
    const action = createDemosWalletAction({ client });
    const result = await action.execute({ context: { mode: "connect" } });

    expect(result.success).toBe(false);
    expect(result.error).toContain("browser environment");
  });

  it("never calls the client", async () => {
    const client = createMockClient();
    const action = createDemosWalletAction({ client });
    await action.execute({ context: {} });
    expect(client.execute).not.toHaveBeenCalled();
  });
});
