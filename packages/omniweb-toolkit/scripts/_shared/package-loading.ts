import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PACKAGE_ROOT } from "./paths.js";

export async function loadPackageExport<T>(
  distPath: string,
  sourcePath: string,
  exportName: string,
): Promise<T> {
  const distSpecifier = resolveScriptRelativeSpecifier(distPath);
  const sourceSpecifier = resolveScriptRelativeSpecifier(sourcePath);
  try {
    const mod = await import(distSpecifier);
    if (exportName in mod) {
      return mod[exportName as keyof typeof mod] as T;
    }
  } catch (error) {
    if (!isModuleUnavailableError(error, distPath)) {
      throw error;
    }
    // Fall back to source only in repo/dev mode before the package has been built.
  }

  const mod = await import(sourceSpecifier);
  if (!(exportName in mod)) {
    throw new Error(`${exportName} export not found in ${distPath} or ${sourcePath}`);
  }
  return mod[exportName as keyof typeof mod] as T;
}

export async function loadPackageModule<T extends Record<string, unknown>>(
  distPath: string,
  sourcePath: string,
): Promise<T> {
  const distSpecifier = resolveScriptRelativeSpecifier(distPath);
  const sourceSpecifier = resolveScriptRelativeSpecifier(sourcePath);
  try {
    return await import(distSpecifier) as T;
  } catch (error) {
    if (!isModuleUnavailableError(error, distPath)) {
      throw error;
    }
    // Fall back to source only in repo/dev mode before the package has been built.
  }

  return await import(sourceSpecifier) as T;
}

export async function loadConnect(): Promise<(opts?: {
  envPath?: string;
  agentName?: string;
  rpcUrl?: string;
  stateDir?: string;
  allowInsecureUrls?: boolean;
}) => Promise<any>> {
  return loadPackageExport("../dist/runtime.js", "../src/runtime.ts", "connect");
}

function isModuleUnavailableError(error: unknown, sourcePath: string): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message ?? "";
  return (
    message.includes("Cannot find module") ||
    message.includes("ERR_MODULE_NOT_FOUND") ||
    message.includes(sourcePath)
  );
}

function resolveScriptRelativeSpecifier(specifier: string): string {
  if (!specifier.startsWith(".")) {
    return specifier;
  }
  return pathToFileURL(resolve(PACKAGE_ROOT, "scripts", specifier)).href;
}
