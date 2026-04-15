import { describe, it, expect, vi } from "vitest";

import { createSessionFromRuntime } from "../../packages/omniweb-toolkit/src/session-factory.js";
import type { AgentRuntime } from "../../src/toolkit/agent-runtime.js";

function makeRuntime(): AgentRuntime {
  return {
    toolkit: {} as any,
    sdkBridge: {} as any,
    address: "0xagent",
    rpcUrl: "https://rpc.custom",
    algorithm: "ml-dsa",
    getToken: vi.fn().mockResolvedValue("token-123"),
    demos: {} as any,
    authenticatedApiCall: vi.fn(),
    llmProvider: null,
  } as AgentRuntime;
}

describe("createSessionFromRuntime", () => {
  it("inherits rpcUrl and algorithm from the connected runtime", async () => {
    const session = await createSessionFromRuntime(makeRuntime(), { stateDir: "/tmp/omniweb-session-factory-test" });

    expect(session.walletAddress).toBe("0xagent");
    expect(session.rpcUrl).toBe("https://rpc.custom");
    expect(session.algorithm).toBe("ml-dsa");
  });
});
