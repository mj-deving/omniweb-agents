/**
 * Subprocess runner for Sentinel session-runner.
 *
 * Spawns Phase 2+ tools as child processes and captures their JSON stdout.
 * This preserves CLI tool boundaries — no need to refactor existing tools
 * for import-based composition.
 *
 * Usage:
 *   import { runTool } from "./lib/util/subprocess.js";
 *   const result = await runTool("tools/audit.ts", ["--update", "--json"]);
 *   const data = JSON.parse(result.stdout);
 */

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { mkdtempSync, openSync, closeSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";

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

function formatNonJsonOutputError(stdout: string, label = "tool"): Error {
  return new Error(`${label} returned non-JSON output: ${stdout.trim().slice(0, 200)}`);
}

/**
 * Parse tool stdout as JSON.
 *
 * Some third-party SDKs print diagnostic objects to stdout before the tool's
 * final JSON payload. In that case we recover the last valid JSON object/array
 * from stdout instead of failing the phase.
 */
export function parseToolJsonOutput(stdout: string, label = "tool"): any {
  const trimmed = stdout.trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed);
  } catch {
    for (let i = trimmed.length - 1; i >= 0; i--) {
      const ch = trimmed[i];
      if (ch !== "}" && ch !== "]") continue;
      for (let start = i; start >= 0; start--) {
        const opener = trimmed[start];
        if (opener !== "{" && opener !== "[") continue;
        const candidate = trimmed.slice(start, i + 1).trim();
        if (!candidate) continue;
        try {
          return JSON.parse(candidate);
        } catch {
          // Keep searching for an outer JSON boundary.
        }
      }
      break;
    }
    throw formatNonJsonOutputError(trimmed, label);
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
  options: { cwd?: string; timeout?: number; env?: Record<string, string | undefined> } = {}
): Promise<ToolResult> {
  const { cwd, timeout = 120_000, env = {} } = options;
  const resolvedTool = resolve(cwd || process.cwd(), toolPath);
  const tempDir = mkdtempSync(resolve(tmpdir(), "tool-runner-"));
  const stdoutPath = resolve(tempDir, "stdout.log");
  const stderrPath = resolve(tempDir, "stderr.log");
  const stdoutFd = openSync(stdoutPath, "w");
  const stderrFd = openSync(stderrPath, "w");

  return new Promise<ToolResult>((resolvePromise, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", resolvedTool, ...args], {
      cwd: cwd || process.cwd(),
      stdio: ["ignore", stdoutFd, stderrFd],
      env: { ...process.env, ...env },
    });

    // Track whether process has exited (Codex finding #3: child.killed is
    // true after SIGTERM is sent, not after process exits — use exit flag)
    let exited = false;

    const cleanup = (): void => {
      try { closeSync(stdoutFd); } catch { /* already closed */ }
      try { closeSync(stderrFd); } catch { /* already closed */ }
      try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* best effort */ }
    };

    const readOutput = (): { stdout: string; stderr: string } => ({
      stdout: existsSync(stdoutPath) ? readFileSync(stdoutPath, "utf-8") : "",
      stderr: existsSync(stderrPath) ? readFileSync(stderrPath, "utf-8") : "",
    });

    // Timeout handling
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      // Give 5s for graceful shutdown, then force kill using exit flag
      setTimeout(() => {
        if (!exited) {
          try { child.kill("SIGKILL"); } catch { /* already gone */ }
        }
      }, 5000);
      const { stderr } = readOutput();
      cleanup();
      reject(new ToolError(toolPath, -1, stderr || `Timed out after ${timeout}ms`));
    }, timeout);

    child.on("error", (err) => {
      clearTimeout(timer);
      cleanup();
      reject(new ToolError(toolPath, -1, err.message));
    });

    child.on("close", (code) => {
      exited = true;
      clearTimeout(timer);
      const { stdout, stderr } = readOutput();
      cleanup();
      const exitCode = code ?? 1;

      if (exitCode !== 0) {
        reject(new ToolError(toolPath, exitCode, stderr));
        return;
      }

      resolvePromise({ stdout, stderr, exitCode });
    });
  });
}
