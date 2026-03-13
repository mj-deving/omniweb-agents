#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const res = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  encoding: "utf8"
});

if (res.status !== 0) {
  const err = (res.stderr || res.stdout || "failed to set hooksPath").trim();
  console.error(`install-hooks: FAIL - ${err}`);
  process.exit(1);
}

console.log("install-hooks: PASS - core.hooksPath set to .githooks");
