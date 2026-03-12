#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const root = process.cwd();
const defaultSkill = path.join(root, "skills", "supercolony", "SKILL.md");
const skillPath = path.resolve(process.argv[2] || defaultSkill);

if (!fs.existsSync(skillPath)) {
  console.error(`skill not found: ${skillPath}`);
  process.exit(1);
}

const content = fs.readFileSync(skillPath, "utf8");
const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!m) {
  console.error("missing frontmatter block");
  process.exit(1);
}

const frontmatterRaw = m[1];
const body = m[2];
const lines = body.split("\n").length;
const words = body.trim().split(/\s+/).filter(Boolean).length;

let fmObject = {};
try {
  fmObject = YAML.parse(frontmatterRaw) || {};
} catch (err) {
  console.error(`frontmatter yaml parse failed: ${err.message}`);
  process.exit(1);
}
const fm = new Map(Object.entries(fmObject));

function has(regex) {
  return regex.test(body);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function sectionPresent(title) {
  return body.includes(`## ${title}`);
}

function scoreProgressiveDisclosure() {
  let score = 0;
  const refs = fs.existsSync(path.join(path.dirname(skillPath), "references"));
  if (lines <= 150) score += 10;
  else if (lines <= 300) score += 7;
  else if (lines <= 500) score += 4;

  if (refs) score += 10;
  else if (lines <= 100) score += 8;
  else if (lines <= 200) score += 4;

  // flat refs depth check
  if (refs) {
    const nested = fs.readdirSync(path.join(path.dirname(skillPath), "references"), { withFileTypes: true }).some((d) => d.isDirectory());
    score += nested ? 2 : 5;
  } else {
    score += 5;
  }

  const hasToc = /(^##?\s*(Table of Contents|Contents|TOC)\b)|\[[^\]]+\]\(#/im.test(body);
  if (lines <= 100 || hasToc) score += 5;

  return clamp(score, 0, 30);
}

function scoreEaseOfUse() {
  let score = 0;
  const desc = String(fm.get("description") || "").toLowerCase();
  const required = ["name", "description", "allowed-tools", "version", "author", "license"];
  for (const key of required) if (fm.has(key)) score += 1;
  if (String(fm.get("description") || "").length >= 80) score += 4;

  if (desc.includes("use when")) score += 3;
  if (desc.includes("trigger with")) score += 3;

  if (/^\s*1\.\s+/m.test(body)) score += 3;
  const sectionCount = (body.match(/^##\s+/gm) || []).length;
  if (sectionCount >= 6) score += 2;
  else if (sectionCount >= 4) score += 1;

  return clamp(score, 0, 25);
}

function scoreUtility() {
  let score = 0;

  if (sectionPresent("Overview")) score += 4;
  if (sectionPresent("Prerequisites")) score += 2;
  if (sectionPresent("Output")) score += 2;

  if (/(optional|config|parameter|flag|option)/i.test(body)) score += 2;
  if (/(alternatively|or use|another approach)/i.test(body)) score += 2;
  if (/(extend|customize|adapt|modify)/i.test(body)) score += 1;

  if (sectionPresent("Error Handling")) score += 2;
  if (/(validate|verify|check|test|confirm)/i.test(body)) score += 1;
  if (/(troubleshoot|debug|diagnose|fix)/i.test(body)) score += 1;

  if (sectionPresent("Examples")) score += 2;
  if (((body.match(/```/g) || []).length / 2) >= 2) score += 1;

  return clamp(score, 0, 20);
}

function scoreSpecCompliance() {
  let score = 0;
  const required = ["name", "description", "allowed-tools", "version", "author", "license"];
  score += required.filter((k) => fm.has(k)).length >= 6 ? 5 : required.filter((k) => fm.has(k)).length;

  const name = String(fm.get("name") || "");
  if (/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name) && name.length <= 64) score += 4;

  const desc = String(fm.get("description") || "");
  if (desc.length >= 50 && desc.length <= 1024) score += 4;

  if (fm.has("compatibility") || fm.has("compatible-with") || fm.has("tags")) score += 2;

  return clamp(score, 0, 15);
}

function scoreWritingStyle() {
  let score = 0;
  if (/^\s*\d+\.\s*(Run|Use|Select|Confirm|Check|Generate|Publish|Verify)/m.test(body)) score += 4;
  else score += 2;

  if (!/\b(I can|I will|you can|you should)\b/i.test(body)) score += 3;
  else score += 1;

  if (words <= 2000) score += 3;
  else if (words <= 3000) score += 2;
  else score += 0;

  return clamp(score, 0, 10);
}

function grade(total) {
  if (total >= 90) return "A";
  if (total >= 80) return "B";
  if (total >= 70) return "C";
  if (total >= 60) return "D";
  return "F";
}

const breakdown = {
  progressive_disclosure: scoreProgressiveDisclosure(),
  ease_of_use: scoreEaseOfUse(),
  utility: scoreUtility(),
  spec_compliance: scoreSpecCompliance(),
  writing_style: scoreWritingStyle()
};

const total =
  breakdown.progressive_disclosure +
  breakdown.ease_of_use +
  breakdown.utility +
  breakdown.spec_compliance +
  breakdown.writing_style;

console.log(`skill: ${path.relative(root, skillPath)}`);
console.log(`score: ${total}/100 (${grade(total)})`);
for (const [k, v] of Object.entries(breakdown)) {
  console.log(`${k}: ${v}`);
}

if (total < 80) {
  process.exitCode = 1;
}
