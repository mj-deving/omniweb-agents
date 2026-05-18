#!/usr/bin/env npx tsx

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { PACKAGE_ROOT } from "./_shared.js";

interface CommandResult {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: node --import tsx ./scripts/check-npm-publish.ts
       node --import tsx ./scripts/check-npm-publish.ts --release-authorized

Runs package structural checks, npm pack dry-run, npm registry auth detection,
and package-name availability. Emits an explicit release decision for the
current environment without running npm publish.

Options:
  --release-authorized   Treat this as a human-authorized release preflight.
                         The script still does not publish.

Output: JSON publish-preflight report
Exit codes:
  0 = release execution is authorized and ready
  1 = package checks failed, release is not authorized, auth is missing for an
      authorized release, registry status is unknown, or a version strategy is
      required
`);
  process.exit(0);
}

const args = process.argv.slice(2);
const unsupportedArgs = args.filter((arg) => !["--release-authorized"].includes(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const releaseAuthorized = args.includes("--release-authorized");

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as {
  name: string;
  version: string;
  private?: boolean;
  license?: string;
  files?: string[];
  exports?: Record<string, unknown>;
};

const buildCheck = runCommand("npm", ["run", "build"]);
const packageCheck = buildCheck.ok
  ? runCommand("npm", ["run", "check:package"])
  : {
      ok: false,
      exitCode: buildCheck.exitCode,
      stdout: buildCheck.stdout,
      stderr: buildCheck.stderr,
    };
const packDryRun = packageCheck.ok
  ? runCommand("npm", ["pack", "--dry-run", "--json"])
  : {
      ok: false,
      exitCode: packageCheck.exitCode,
      stdout: packageCheck.stdout,
      stderr: packageCheck.stderr,
    };
const npmWhoami = runCommand("npm", ["--workspaces=false", "whoami", "--registry", "https://registry.npmjs.org"]);
const npmView = runCommand("npm", [
  "--workspaces=false",
  "view",
  packageJson.name,
  "version",
  "--json",
  "--registry",
  "https://registry.npmjs.org",
]);

const authOk = npmWhoami.ok;
const publishedVersion = parseJsonMaybe(npmView.stdout);
const registryMissing = /E404|not in this registry|Not Found - GET/i.test(
  `${npmView.stdout}\n${npmView.stderr}`,
);
const packageExists =
  npmView.ok && typeof publishedVersion === "string" && publishedVersion.length > 0;
const registryStatusKnown = npmView.ok || registryMissing;
const packageReady = buildCheck.ok && packageCheck.ok && packDryRun.ok;
const releaseDecision = decideRelease({
  packageReady,
  releaseAuthorized,
  authOk,
  packageExists,
  registryStatusKnown,
});
const nextAction =
  releaseDecision === "ready_to_publish_authorized"
    ? "Release execution is authorized and npm auth is present. A human operator may run npm publish outside this check."
    : releaseDecision === "ready_to_publish_but_not_authorized"
      ? "Do not publish. Obtain explicit release authorization, authenticate to npm in the publishing environment, then rerun with --release-authorized."
      : releaseDecision === "blocked_existing_registry_entry"
        ? `Do not publish this version. Verify version strategy against published ${publishedVersion}.`
        : releaseDecision === "blocked_npm_auth_missing"
          ? "Authorized release preflight is missing npm auth. Run `npm login --registry https://registry.npmjs.org`, then rerun with --release-authorized."
          : releaseDecision === "blocked_registry_status_unknown"
            ? "Resolve npm registry lookup failure before attempting a release."
            : "Fix package validation or pack dry-run failures before attempting a release.";

const releaseExecutionReady = releaseDecision === "ready_to_publish_authorized";

const report = {
  ok: releaseExecutionReady,
  releaseReady: releaseDecision === "ready_to_publish_authorized"
    || releaseDecision === "ready_to_publish_but_not_authorized",
  checkedAt: new Date().toISOString(),
  package: {
    name: packageJson.name,
    version: packageJson.version,
    private: packageJson.private === true,
    license: packageJson.license ?? null,
    files: packageJson.files ?? [],
    exportPaths: Object.keys(packageJson.exports ?? {}),
  },
  releaseDecision,
  releaseAuthorization: {
    authorized: releaseAuthorized,
    source: releaseAuthorized ? "--release-authorized" : "not_authorized",
  },
  releaseExecution: {
    attempted: false,
    command: "npm publish",
    reason: "check:publish is a non-mutating readiness preflight; it never runs npm publish.",
  },
  nextAction,
  checks: {
    packageCheck: {
      ok: packageReady,
      exitCode: buildCheck.ok ? packageCheck.exitCode : buildCheck.exitCode,
      command: buildCheck.ok ? "npm run check:package" : "npm run build",
      error: buildCheck.ok
        ? (packageCheck.ok ? undefined : compactError(packageCheck.stderr || packageCheck.stdout))
        : compactError(buildCheck.stderr || buildCheck.stdout),
    },
    packDryRun: {
      ok: packDryRun.ok,
      exitCode: packDryRun.exitCode,
      command: "npm pack --dry-run --json",
      tarball: parsePackDryRun(packDryRun.stdout),
      error: packDryRun.ok ? undefined : compactError(packDryRun.stderr || packDryRun.stdout),
    },
    npmAuth: {
      ok: authOk,
      username: authOk ? npmWhoami.stdout.trim() : undefined,
      command: "npm whoami --registry https://registry.npmjs.org",
      error: authOk ? undefined : describeNpmAuthError(npmWhoami.stderr || npmWhoami.stdout),
    },
    registryPackage: {
      ok: registryStatusKnown,
      exists: packageExists,
      nameAvailable: !packageExists,
      publishedVersion: packageExists ? publishedVersion : undefined,
      command: `npm view ${packageJson.name} version --json`,
      error: npmView.ok || registryMissing ? undefined : compactError(npmView.stderr || npmView.stdout),
    },
  },
  blockers: [
    ...(packageReady ? [] : ["package_or_pack_check_failed"]),
    ...(registryStatusKnown ? [] : ["registry_status_unknown"]),
    ...(packageExists ? ["registry_package_exists"] : []),
    ...(releaseAuthorized ? [] : ["release_not_authorized"]),
    ...(releaseAuthorized && !authOk ? ["npm_auth_missing"] : []),
  ],
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);

function decideRelease(input: {
  packageReady: boolean;
  releaseAuthorized: boolean;
  authOk: boolean;
  packageExists: boolean;
  registryStatusKnown: boolean;
}):
  | "ready_to_publish_authorized"
  | "ready_to_publish_but_not_authorized"
  | "blocked_npm_auth_missing"
  | "blocked_package_checks_failed"
  | "blocked_registry_status_unknown"
  | "blocked_existing_registry_entry" {
  if (!input.packageReady) return "blocked_package_checks_failed";
  if (!input.registryStatusKnown) return "blocked_registry_status_unknown";
  if (input.packageExists) return "blocked_existing_registry_entry";
  if (!input.releaseAuthorized) return "ready_to_publish_but_not_authorized";
  if (!input.authOk) return "blocked_npm_auth_missing";
  return "ready_to_publish_authorized";
}

function runCommand(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, {
    cwd: PACKAGE_ROOT,
    encoding: "utf8",
    env: process.env,
  });

  return {
    ok: result.status === 0,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function parseJsonMaybe(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function parsePackDryRun(input: string): {
  filename?: string;
  name?: string;
  version?: string;
  files?: number;
  unpackedSize?: number;
} | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!first || typeof first !== "object") return null;
    const entry = first as {
      filename?: unknown;
      name?: unknown;
      version?: unknown;
      files?: unknown[];
      unpackedSize?: unknown;
    };
    return {
      filename: typeof entry.filename === "string" ? entry.filename : undefined,
      name: typeof entry.name === "string" ? entry.name : undefined,
      version: typeof entry.version === "string" ? entry.version : undefined,
      files: Array.isArray(entry.files) ? entry.files.length : undefined,
      unpackedSize: typeof entry.unpackedSize === "number" ? entry.unpackedSize : undefined,
    };
  } catch {
    return null;
  }
}

function compactError(input: string): string | undefined {
  const line = input
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.length > 0 && !part.startsWith("npm warn Ignoring workspaces"));
  return line || undefined;
}

function describeNpmAuthError(input: string): string | undefined {
  if (/E401|Unauthorized/i.test(input)) {
    return "Not authenticated with npm registry";
  }
  return compactError(input);
}
