/**
 * Subprocess runner for Sentinel session-runner.
 *
 * Spawns Phase 2+ tools as child processes and captures their JSON stdout.
 * This preserves CLI tool boundaries — no need to refactor existing tools
 * for import-based composition.
 *
 * Usage:
 *   import { runTool } from "./lib/subprocess.js";
 *   const result = await runTool("tools/audit.ts", ["--update", "--json"]);
 *   const data = JSON.parse(result.stdout);
 */

import { spawn } from "node:child_process";
import { resolve } from "node:path";

// ── Types ──────────────────────────────────────────

export interface ToolResult {
  /** Captured stdout (JSON data from tool) */
  stdout: string;
  /** Captured stderr (info/debug logs from tool) */
  stderr: string;
  /** Process exit code */
  exitCode: number;
}

export class ToolError extends Error {
  exitCode: number;
  stderr: string;
  constructor(tool: string, exitCode: number, stderr: string) {
    super(`Tool "${tool}" failed (exit ${exitCode}): ${stderr.trim().split("\n").pop() || "unknown error"}`);
    this.name = "ToolError";
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

// ── Runner ─────────────────────────────────────────

/**
 * Run a tool as a subprocess and capture output.
 *
 * @param toolPath - Relative path to the tool (e.g. "tools/audit.ts")
 * @param args - CLI arguments to pass
 * @param options - Optional: cwd, timeout (ms, default 120000)
 * @returns ToolResult with stdout, stderr, exitCode
 * @throws ToolError on non-zero exit code
 */
export async function runTool(
  toolPath: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number } = {}
): Promise<ToolResult> {
  const { cwd, timeout = 120_000 } = options;
  const resolvedTool = resolve(cwd || process.cwd(), toolPath);

  return new Promise<ToolResult>((resolvePromise, reject) => {
    const child = spawn("npx", ["tsx", resolvedTool, ...args], {
      cwd: cwd || process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    // Track whether process has exited (Codex finding #3: child.killed is
    // true after SIGTERM is sent, not after process exits — use exit flag)
    let exited = false;

    // Timeout handling
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      // Give 5s for graceful shutdown, then force kill using exit flag
      setTimeout(() => {
        if (!exited) {
          try { child.kill("SIGKILL"); } catch { /* already gone */ }
        }
      }, 5000);
      reject(new ToolError(toolPath, -1, `Timed out after ${timeout}ms`));
    }, timeout);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new ToolError(toolPath, -1, err.message));
    });

    child.on("close", (code) => {
      exited = true;
      clearTimeout(timer);
      const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
      const stderr = Buffer.concat(stderrChunks).toString("utf-8");
      const exitCode = code ?? 1;

      if (exitCode !== 0) {
        reject(new ToolError(toolPath, exitCode, stderr));
        return;
      }

      resolvePromise({ stdout, stderr, exitCode });
    });
  });
}
