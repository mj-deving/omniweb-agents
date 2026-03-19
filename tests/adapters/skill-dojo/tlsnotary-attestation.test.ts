import { describe, it, expect, vi } from "vitest";
import { createTlsnotaryAction } from "../../../src/adapters/skill-dojo/tlsnotary-attestation.js";
import { createMockClient, mockSuccessResponse, mockErrorResponse } from "./mock-client.js";

describe("createTlsnotaryAction", () => {
  it("returns an Action with correct name", () => {
    const client = createMockClient();
    const action = createTlsnotaryAction({ client });
    expect(action.name).toBe("skill-dojo:tlsnotary-attestation");
  });

  describe("validate", () => {
    it("returns true when url is provided", async () => {
      const client = createMockClient();
      const action = createTlsnotaryAction({ client });
      expect(await action.validate({ context: { url: "https://example.com" } })).toBe(true);
    });

    it("returns false when url is missing", async () => {
      const client = createMockClient();
      const action = createTlsnotaryAction({ client });
      expect(await action.validate({ context: {} })).toBe(false);
    });

    it("returns false when url is empty string", async () => {
      const client = createMockClient();
      const action = createTlsnotaryAction({ client });
      expect(await action.validate({ context: { url: "" } })).toBe(false);
    });
  });

  describe("execute", () => {
    it("calls client with url and default GET method", async () => {
      const client = createMockClient();
      (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSuccessResponse("tlsnotary-attestation", {
          attestation: { attested: true, source: "example.com" },
        }),
      );

      const action = createTlsnotaryAction({ client });
      const result = await action.execute({
        context: { url: "https://example.com/api" },
      });

      expect(result.success).toBe(true);
      expect(client.execute).toHaveBeenCalledWith("tlsnotary-attestation", {
        url: "https://example.com/api",
        method: "GET",
      });
    });

    it("passes custom method", async () => {
      const client = createMockClient();
      (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSuccessResponse("tlsnotary-attestation", {}),
      );

      const action = createTlsnotaryAction({ client });
      await action.execute({
        context: { url: "https://api.test.com", method: "POST" },
      });

      expect(client.execute).toHaveBeenCalledWith("tlsnotary-attestation", {
        url: "https://api.test.com",
        method: "POST",
      });
    });

    it("returns error when url is missing at execute time", async () => {
      const client = createMockClient();
      const action = createTlsnotaryAction({ client });
      const result = await action.execute({ context: {} });
      expect(result.success).toBe(false);
      expect(result.error).toBe("url parameter is required");
    });

    it("returns error on client failure", async () => {
      const client = createMockClient();
      (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockErrorResponse("tlsnotary-attestation", "TLS handshake failed"),
      );

      const action = createTlsnotaryAction({ client });
      const result = await action.execute({
        context: { url: "https://bad.url" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("TLS handshake failed");
    });
  });
});
