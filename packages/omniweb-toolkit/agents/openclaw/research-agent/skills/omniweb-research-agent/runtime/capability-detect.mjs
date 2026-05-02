import process from "node:process";

const REQUIRED_ENV = ["DEMOS_MNEMONIC", "RPC_URL", "SUPERCOLONY_API"];
const DEFAULT_COLONY_URL = "https://www.supercolony.ai";

export async function canImport(specifier) {
  try {
    await import(specifier);
    return true;
  } catch {
    return false;
  }
}

export function fallbackColonyUrl() {
  return process.env.COLONY_URL || process.env.OMNIWEB_COLONY_URL || DEFAULT_COLONY_URL;
}

export async function detectCapabilities() {
  const [toolkitModule, toolkitAgentModule] = await Promise.all([
    import("omniweb-toolkit").catch(() => null),
    import("omniweb-toolkit/agent").catch(() => null),
  ]);

  const toolkitCore = Boolean(toolkitModule);
  const toolkitAgent = Boolean(toolkitAgentModule);

  const env = Object.fromEntries(REQUIRED_ENV.map((key) => [key, Boolean(process.env[key])]));
  const writeReadiness = toolkitModule?.checkWriteReadiness ? toolkitModule.checkWriteReadiness() : null;
  const runtimeConfig = toolkitModule?.getMinimalAgentRuntimeConfig && toolkitAgentModule?.getDefaultSessionLedgerDir
    ? toolkitModule.getMinimalAgentRuntimeConfig(toolkitAgentModule.getDefaultSessionLedgerDir())
    : null;

  return {
    toolkitCore,
    toolkitAgent,
    env,
    writeReadiness,
    runtimeConfig,
    colonyUrl: runtimeConfig?.colonyUrl || fallbackColonyUrl(),
    ready: {
      bundle: true,
      dryRun: toolkitCore && toolkitAgent,
      liveRead: toolkitCore && toolkitAgent,
      liveWrite: toolkitCore && toolkitAgent && Boolean(writeReadiness?.canWrite),
    },
  };
}

export async function resolveSharedColonyUrl(capabilities) {
  return capabilities?.colonyUrl || fallbackColonyUrl();
}

export function resolveStarterMode(explicitMode, capabilities, defaults = {}) {
  const mode = explicitMode || defaults.defaultMode || "auto";
  if (mode === "dry-run" && !capabilities.ready.dryRun) return "bundle";
  if (mode === "live-read" && !capabilities.ready.liveRead) return "bundle";
  if (mode === "live-write" && !capabilities.ready.liveWrite) return mode;
  if (mode !== "auto") return mode;
  if (!capabilities.ready.dryRun) return "bundle";
  return defaults.autoWhenDryRunReady || "dry-run";
}

export function summarizeCapabilities(capabilities) {
  const envSummary = Object.entries(capabilities.env)
    .map(([key, value]) => `${key}=${value ? "yes" : "no"}`)
    .join(", ");
  const readinessSummary = capabilities.writeReadiness
    ? `writeReady=${capabilities.writeReadiness.canWrite ? "yes" : "no"}`
    : "writeReady=unknown";

  return [
    `toolkitCore=${capabilities.toolkitCore ? "yes" : "no"}`,
    `toolkitAgent=${capabilities.toolkitAgent ? "yes" : "no"}`,
    envSummary,
    readinessSummary,
    `ready(bundle=${capabilities.ready.bundle ? "yes" : "no"}, dryRun=${capabilities.ready.dryRun ? "yes" : "no"}, liveRead=${capabilities.ready.liveRead ? "yes" : "no"}, liveWrite=${capabilities.ready.liveWrite ? "yes" : "no"})`,
  ].join(" | ");
}
