#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pluginRoot = path.join(root, "plugins", "demos-supercolony");
const releaseRoot = path.join(pluginRoot, "release");
const snapshotsRoot = path.join(releaseRoot, "snapshots");
const templatesRoot = path.join(releaseRoot, "templates");

function stamp(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}-${hh}${mm}${ss}`;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function copyTree(src, dst, skip = new Set()) {
  ensureDir(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to, skip);
    } else {
      copyFile(from, to);
    }
  }
}

if (!fs.existsSync(pluginRoot)) {
  console.error("Plugin root missing: plugins/demos-supercolony");
  process.exit(1);
}

const id = stamp();
const outDir = path.join(snapshotsRoot, id);

ensureDir(outDir);
copyTree(pluginRoot, path.join(outDir, "plugin"), new Set(["release"]));

for (const tpl of [
  "CHANGELOG.publish-template.md",
  "marketplace-metadata.publish-template.json"
]) {
  const src = path.join(templatesRoot, tpl);
  if (fs.existsSync(src)) {
    copyFile(src, path.join(outDir, tpl.replace(".publish-template", "")));
  }
}

const note = [
  "# Snapshot Note",
  "",
  `Created (UTC): ${new Date().toISOString()}`,
  "This snapshot is publish-prep material and does not need continuous maintenance.",
  "Edit metadata/changelog in this snapshot when preparing external publication."
].join("\n");

fs.writeFileSync(path.join(outDir, "SNAPSHOT.md"), `${note}\n`);

console.log(`created snapshot: ${path.relative(root, outDir)}`);
