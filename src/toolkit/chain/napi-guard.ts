import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { toErrorMessage } from "../util/errors.js";

/**
 * NAPI Guard — tests whether xmcore native bindings load without crashing.
 *
 * Uses child_process.fork() so a NAPI SIGSEGV crash kills the child, not the agent.
 * Result is cached for the session — only tested once.
 */

export interface NapiCapability {
  available: boolean;
  error?: string;
  testedAt: string;
}

let cachedCapability: NapiCapability | null = null;

const PROBE_TIMEOUT_MS = 10_000;

/**
 * Test whether xmcore NAPI bindings load without crashing.
 * Runs the import in an isolated child process — NAPI crash kills the child, not the agent.
 * Result is cached for the session — only tested once.
 */
export async function testNapiCapability(): Promise<NapiCapability> {
  if (cachedCapability) return cachedCapability;

  const testedAt = new Date().toISOString();

  try {
    const result = await probeInChildProcess();
    cachedCapability = { ...result, testedAt };
    return cachedCapability;
  } catch (err: unknown) {
    cachedCapability = { available: false, error: toErrorMessage(err), testedAt };
    return cachedCapability;
  }
}

/**
 * Fork a child process that attempts to import xmcore.
 * If xmcore crashes (SIGSEGV), the child dies and we get exit code !== 0.
 */
function probeInChildProcess(): Promise<{ available: boolean; error?: string }> {
  return new Promise((resolve, reject) => {
    // The probe script is an inline eval — no separate file needed
    const child = fork("-e", [
      `try { require("@kynesyslabs/demosdk/xmcore"); process.send({ available: typeof require("@kynesyslabs/demosdk/xmcore").EVM === "function" }); } catch(e) { process.send({ available: false, error: e.message }); }`,
    ], {
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      timeout: PROBE_TIMEOUT_MS,
    });

    const timer = setTimeout(() => {
      child.kill();
      resolve({ available: false, error: "probe timed out" });
    }, PROBE_TIMEOUT_MS);

    child.on("message", (msg: unknown) => {
      clearTimeout(timer);
      child.kill();
      const result = msg as { available: boolean; error?: string };
      resolve({ available: result.available, error: result.error });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ available: false, error: toErrorMessage(err) });
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      if (signal === "SIGSEGV" || signal === "SIGABRT") {
        resolve({ available: false, error: `NAPI crash: ${signal}` });
      } else if (code !== 0 && code !== null) {
        resolve({ available: false, error: `probe exited with code ${code}` });
      }
      // If we already resolved via message, this is a no-op
    });
  });
}

/**
 * Check if xmcore is available without re-testing.
 * Returns false if not yet tested.
 */
export function isXmcoreAvailable(): boolean {
  return cachedCapability?.available ?? false;
}

/**
 * Reset the cached capability (for testing).
 */
export function resetNapiCache(): void {
  cachedCapability = null;
}
