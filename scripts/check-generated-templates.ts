#!/usr/bin/env -S bunx tsx
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { EXAMPLE_INTENTS } from "../src/toolkit/compiler/examples.js";
import { composeTemplate } from "../src/toolkit/compiler/template-composer.js";

const GENERATED_ROOT = "templates/generated";

interface Failure {
  path: string;
  reason: string;
}

function trackedGeneratedFiles(): string[] {
  const result = spawnSync("git", ["ls-files", `${GENERATED_ROOT}/**`], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "git ls-files failed");
  }
  return result.stdout.split("\n").filter(Boolean).sort();
}

function expectedGeneratedFiles(): Map<string, string> {
  const expected = new Map<string, string>();
  for (const example of EXAMPLE_INTENTS) {
    const template = composeTemplate(example.config);
    for (const [filename, content] of template.files) {
      expected.set(join(GENERATED_ROOT, example.config.name, filename), content);
    }
  }
  return expected;
}

const tracked = trackedGeneratedFiles();
const expected = expectedGeneratedFiles();
const failures: Failure[] = [];

for (const path of tracked) {
  if (!expected.has(path)) {
    failures.push({ path, reason: "tracked file is not produced by composeTemplate()" });
  }
}

for (const [path, expectedContent] of expected) {
  if (!tracked.includes(path)) {
    failures.push({ path, reason: "expected generated template file is not tracked" });
    continue;
  }
  const absolutePath = join(process.cwd(), path);
  if (!existsSync(absolutePath)) {
    failures.push({ path, reason: "tracked generated template file is missing from worktree" });
    continue;
  }
  const actualContent = readFileSync(absolutePath, "utf8");
  if (actualContent !== expectedContent) {
    failures.push({ path, reason: "content differs from composeTemplate() output" });
  }
}

if (failures.length > 0) {
  console.error("Generated template check failed:");
  for (const failure of failures) {
    console.error(`- ${failure.path}: ${failure.reason}`);
  }
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  examples: EXAMPLE_INTENTS.length,
  trackedFiles: tracked.length,
  generatedRoot: GENERATED_ROOT,
}, null, 2));
