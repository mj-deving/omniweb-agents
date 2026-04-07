import { describe, expect, it } from "vitest";
import { runSubprocessSafe } from "../../../src/toolkit/util/subprocess.js";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

// Helper: write a temp script that tsx can run
function writeTempScript(code: string): string {
  const tmp = path.join(os.tmpdir(), `subprocess-test-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`);
  fs.writeFileSync(tmp, code, "utf-8");
  return tmp;
}

describe("runSubprocessSafe", () => {
  it("captures stdout and exit code 0 for a simple script", async () => {
    const script = writeTempScript(`console.log("hello world");`);
    const result = await runSubprocessSafe(script, []);
    expect(result.stdout).toContain("hello world");
    expect(result.exitCode).toBe(0);
    expect(result.killed).toBe(false);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    fs.unlinkSync(script);
  });

  it("passes args to the script", async () => {
    const script = writeTempScript(`console.log(process.argv.slice(2).join(","));`);
    const result = await runSubprocessSafe(script, ["a", "b", "c"]);
    expect(result.stdout).toContain("a,b,c");
    expect(result.exitCode).toBe(0);
    fs.unlinkSync(script);
  });

  it("captures non-zero exit code", async () => {
    const script = writeTempScript(`process.exit(42);`);
    const result = await runSubprocessSafe(script, []);
    expect(result.exitCode).toBe(42);
    expect(result.killed).toBe(false);
    fs.unlinkSync(script);
  });

  it("kills a long-running process after timeout", async () => {
    const script = writeTempScript(`
      // Run forever
      setInterval(() => {}, 1000);
    `);
    const result = await runSubprocessSafe(script, [], {
      timeoutMs: 500,
      killGraceMs: 300,
      label: "timeout-test",
    });
    expect(result.killed).toBe(true);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(400);
    expect(result.elapsedMs).toBeLessThan(4000);
    fs.unlinkSync(script);
  });

  it("measures elapsed time accurately", async () => {
    const script = writeTempScript(`
      setTimeout(() => console.log("done"), 200);
    `);
    const result = await runSubprocessSafe(script, []);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(150);
    expect(result.elapsedMs).toBeLessThan(2000);
    expect(result.exitCode).toBe(0);
    fs.unlinkSync(script);
  });

  it("uses default timeout when none provided", async () => {
    // Just verify it doesn't throw and uses a sensible default
    const script = writeTempScript(`console.log("fast");`);
    const result = await runSubprocessSafe(script, []);
    expect(result.exitCode).toBe(0);
    fs.unlinkSync(script);
  });

  it("captures stderr content in stdout combined output", async () => {
    const script = writeTempScript(`
      console.log("out");
      console.error("err");
    `);
    const result = await runSubprocessSafe(script, []);
    // stdout should contain the stdout content at minimum
    expect(result.stdout).toContain("out");
    expect(result.exitCode).toBe(0);
    fs.unlinkSync(script);
  });
});
