import { describe, it, expect, vi } from "vitest";
import { createIdentityAction } from "../../../src/adapters/skill-dojo/identity-agent.js";
import { createMockClient, mockSuccessResponse, mockErrorResponse } from "./mock-client.js";

describe("createIdentityAction", () => {
  it("returns an Action with correct name", () => {
    const client = createMockClient();
    const action = createIdentityAction({ client });
    expect(action.name).toBe("skill-dojo:identity-agent");
  });

  describe("validate", () => {
    it("returns true for valid modes", async () => {
      const client = createMockClient();
      const action = createIdentityAction({ client });

      expect(await action.validate({ context: { mode: "resolve" } })).toBe(true);
      expect(await action.validate({ context: { mode: "create" } })).toBe(true);
      expect(await action.validate({ context: { mode: "add-web3" } })).toBe(true);
    });

    it("returns true when no mode specified (defaults to resolve)", async () => {
      const client = createMockClient();
      const action = createIdentityAction({ client });
      expect(await action.validate({ context: {} })).toBe(true);
    });

    it("returns false for invalid mode", async () => {
      const client = createMockClient();
      const action = createIdentityAction({ client });
      expect(await action.validate({ context: { mode: "delete" } })).toBe(false);
    });
  });

  describe("execute", () => {
    it("calls client with mapped params", async () => {
      const client = createMockClient();
      (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSuccessResponse("identity-agent", { profile: { name: "test" } }, "Profile resolved"),
      );

      const action = createIdentityAction({ client });
      const result = await action.execute({
        context: { mode: "resolve", address: "dem1abc", chain: "demos" },
      });

      expect(result.success).toBe(true);
      expect(result.text).toBe("Profile resolved");
      expect(client.execute).toHaveBeenCalledWith("identity-agent", expect.objectContaining({
        mode: "resolve",
        address: "dem1abc",
        chain: "demos",
      }));
    });

    it("returns error on failure", async () => {
      const client = createMockClient();
      (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockErrorResponse("identity-agent", "Profile not found"),
      );

      const action = createIdentityAction({ client });
      const result = await action.execute({ context: { mode: "resolve" } });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Profile not found");
    });
  });
});
