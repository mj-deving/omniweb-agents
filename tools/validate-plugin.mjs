#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pluginRoot = path.join(root, "plugins", "demos-supercolony");
const pluginJsonPath = path.join(pluginRoot, ".claude-plugin", "plugin.json");
const skillPath = path.join(root, "skills", "supercolony", "SKILL.md");

const checks = [];

function add(ok, message) {
  checks.push({ ok, message });
}

function exists(p) {
  return fs.existsSync(p);
}

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function parseFrontmatter(markdown) {
  const m = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const raw = m[1];
  const body = m[2];
  const map = new Map();

  for (const line of raw.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    map.set(key, value);
  }

  return { map, body };
}

add(exists(pluginRoot), "Plugin root exists: plugins/demos-supercolony");
add(exists(pluginJsonPath), "Plugin manifest exists: .claude-plugin/plugin.json");

if (exists(pluginJsonPath)) {
  try {
    const json = JSON.parse(read(pluginJsonPath));
    for (const field of ["name", "version", "description", "author", "license"]) {
      add(Boolean(json[field]), `plugin.json has field: ${field}`);
    }
  } catch (err) {
    add(false, `plugin.json is valid JSON (${err.message})`);
  }
}

for (const rel of [
  "commands/run-session.md",
  "commands/audit-agent.md",
  "commands/scan-feed.md",
  "commands/view-session-report.md",
  "agents/sentinel-operator.md",
  "skills/supercolony/SKILL.md",
  "hooks/hooks.json",
  "scripts/post-edit-hint.sh",
  "README.md"
]) {
  add(exists(path.join(pluginRoot, rel)), `Plugin file exists: ${rel}`);
}

if (exists(skillPath)) {
  const parsed = parseFrontmatter(read(skillPath));
  add(Boolean(parsed), "SKILL.md has frontmatter");
  if (parsed) {
    const required = ["name", "description", "allowed-tools", "version", "author", "license"];
    for (const field of required) {
      add(parsed.map.has(field), `SKILL.md frontmatter has field: ${field}`);
    }

    const sections = [
      "## Overview",
      "## Prerequisites",
      "## Instructions",
      "## Output",
      "## Error Handling",
      "## Examples",
      "## Resources"
    ];

    for (const section of sections) {
      add(parsed.body.includes(section), `SKILL.md contains section: ${section}`);
    }
  }
} else {
  add(false, "SKILL.md exists at skills/supercolony/SKILL.md");
}

const passed = checks.filter((c) => c.ok).length;
const total = checks.length;
const pct = Math.round((passed / total) * 100);

console.log("demos-supercolony plugin validation");
console.log(`score: ${passed}/${total} (${pct}%)`);
for (const check of checks) {
  const mark = check.ok ? "PASS" : "FAIL";
  console.log(`${mark} ${check.message}`);
}

if (passed !== total) {
  process.exit(1);
}
