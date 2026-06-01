import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: bun ./scripts/check-legacy-root-archive.ts");
  console.log("Fails when active docs, scripts, tests, or package guidance reference the archived root runner route.");
  process.exit(0);
}

const packageRoot = resolve(new URL("..", import.meta.url).pathname);
const repoRoot = resolve(packageRoot, "..", "..");

const ignoredDirs = new Set([
  ".beads",
  ".git",
  "dist",
  "node_modules",
  "vendor",
]);

const allowedPrefixes = [
  "docs/archive/",
  "packages/omniweb-toolkit/scripts/check-legacy-root-archive.ts",
];

const scannedPrefixes = [
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "package.json",
  "docs/",
  "docs-site/",
  "packages/omniweb-toolkit/AGENTS.md",
  "packages/omniweb-toolkit/GUIDE.md",
  "packages/omniweb-toolkit/README.md",
  "packages/omniweb-toolkit/SKILL.md",
  "packages/omniweb-toolkit/TOOLKIT.md",
  "packages/omniweb-toolkit/assets/",
  "packages/omniweb-toolkit/playbooks/",
  "packages/omniweb-toolkit/references/",
  "packages/omniweb-toolkit/scripts/",
  "packages/omniweb-toolkit/package.json",
  "scripts/",
  "templates/",
  "tests/",
];

const retiredRoutePatterns = [
  /cli\/session-runner\.ts/g,
  /cli\/v3-loop(?:-[a-z]+)?\.ts/g,
  /cli\/v3-strategy-bridge\.ts/g,
  /cli\/publish-executor\.(?:ts|js)/g,
  /cli\/action-executor\.(?:ts|js)/g,
  /cli\/hive-query\.ts/g,
  /cli\/audit\.ts/g,
  /cli\/verify\.ts/g,
  /\bsession-runner\b/g,
  /\bv3-loop\b/g,
  /\bv3-strategy-bridge\b/g,
  /\bhive-query\b/g,
  /--loop-version/g,
  /--legacy-loop/g,
];

interface Finding {
  path: string;
  line: number;
  match: string;
}

function isAllowed(path: string): boolean {
  return allowedPrefixes.some((prefix) => path === prefix || path.startsWith(prefix));
}

function shouldScan(path: string): boolean {
  if (isAllowed(path)) return false;
  return scannedPrefixes.some((prefix) => path === prefix || path.startsWith(prefix));
}

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = relative(repoRoot, fullPath).replaceAll("\\", "/");
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (ignoredDirs.has(entry) || isAllowed(`${relPath}/`)) continue;
      files.push(...walk(fullPath));
      continue;
    }
    if (stat.isFile() && shouldScan(relPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function scanFile(file: string): Finding[] {
  const relPath = relative(repoRoot, file).replaceAll("\\", "/");
  const lines = readFileSync(file, "utf8").split("\n");
  const findings: Finding[] = [];
  lines.forEach((lineText, index) => {
    for (const pattern of retiredRoutePatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(lineText);
      if (match) {
        findings.push({
          path: relPath,
          line: index + 1,
          match: match[0],
        });
      }
    }
  });
  return findings;
}

const findings = walk(repoRoot).flatMap(scanFile);

if (findings.length > 0) {
  console.error("Retired root runner/readback route references found outside docs/archive:");
  for (const finding of findings) {
    console.error(`${finding.path}:${finding.line}: ${finding.match}`);
  }
  process.exit(1);
}

console.log("legacy-root-archive: ok");
