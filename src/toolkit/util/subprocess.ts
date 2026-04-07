/**
 * Safe subprocess runner with timeout and kill escalation.
 *
 * Spawns a TypeScript script via `npx tsx`, enforces a timeout,
 * and escalates from SIGTERM to SIGKILL if the process doesn't exit.
 *
 * Toolkit-layer primitive — no imports from cli/ or src/lib/.
 */

import { spawn } from "node:child_process";

export interface SubprocessOptions {
  /** Maximum wall-clock time before kill escalation (default 180_000). */
  timeoutMs?: number;
  /** Grace period between SIGTERM and SIGKILL (default 2000). */
  killGraceMs?: number;
  /** Human-readable label for logging. */
  label?: string;
}

export interface SubprocessResult {
  stdout: string;
  exitCode: number;
  /** True if the process was killed due to timeout. */
  killed: boolean;
  elapsedMs: number;
}

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_KILL_GRACE_MS = 2_000;

export async function runSubprocessSafe(
  script: string,
  args: string[],
  opts?: SubprocessOptions,
): Promise<SubprocessResult> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const killGraceMs = opts?.killGraceMs ?? DEFAULT_KILL_GRACE_MS;

  const start = performance.now();

  return new Promise<SubprocessResult>((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", script, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];

    child.stdout.on("data", (data: Buffer) => chunks.push(data));
    child.stderr.on("data", (data: Buffer) => chunks.push(data));

    let killed = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let killHandle: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (killHandle) clearTimeout(killHandle);
    };

    // Timeout: SIGTERM first, then SIGKILL after grace period
    timeoutHandle = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");

      killHandle = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          // Process may have already exited after SIGTERM
        }
      }, killGraceMs);
    }, timeoutMs);

    child.on("close", (code) => {
      cleanup();
      const elapsedMs = Math.round(performance.now() - start);
      resolve({
        stdout: Buffer.concat(chunks).toString("utf-8"),
        exitCode: code ?? 1,
        killed,
        elapsedMs,
      });
    });

    child.on("error", (err) => {
      cleanup();
      const elapsedMs = Math.round(performance.now() - start);
      resolve({
        stdout: err.message,
        exitCode: 1,
        killed: false,
        elapsedMs,
      });
    });
  });
}
