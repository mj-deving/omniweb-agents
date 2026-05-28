import { existsSync, lstatSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PACKAGE_ROOT } from "./paths.js";

export function ensureLocalPackageResolution(workspaceRoot: string): void {
  const nodeModulesDir = resolve(workspaceRoot, "node_modules");
  const packageDir = resolve(nodeModulesDir, "omniweb-toolkit");
  if (existsSync(packageDir)) {
    const stat = lstatSync(packageDir);
    if (!stat.isSymbolicLink()) {
      return;
    }
    rmSync(packageDir, { recursive: true, force: true });
  }

  mkdirSync(packageDir, { recursive: true });
  writeFileSync(resolve(packageDir, "package.json"), `${JSON.stringify({
    name: "omniweb-toolkit",
    type: "module",
    exports: {
      "./agent": "./agent.js",
    },
  }, null, 2)}\n`);
  const sourceAgent = resolve(PACKAGE_ROOT, "src", "agent.ts");
  const builtAgent = resolve(PACKAGE_ROOT, "dist", "agent.js");
  const agentTarget = existsSync(sourceAgent) ? sourceAgent : builtAgent;
  if (!existsSync(agentTarget)) {
    throw new Error(`Could not resolve local omniweb-toolkit/agent target from ${PACKAGE_ROOT}`);
  }

  writeFileSync(
    resolve(packageDir, "agent.js"),
    `export * from ${JSON.stringify(pathToFileURL(agentTarget).href)};\n`,
  );
}
