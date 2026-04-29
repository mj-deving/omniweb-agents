import process from "node:process";

const REQUIRED_ENV = ["DEMOS_MNEMONIC", "RPC_URL", "SUPERCOLONY_API"];

export async function canImport(specifier) {
  try {
    await import(specifier);
    return true;
  } catch {
    return false;
  }
}

export async function detectCapabilities() {
  const [toolkitModule, toolkitAgent] = await Promise.all([
    import("omniweb-toolkit").catch(() => null),
    canImport("omniweb-toolkit/agent"),
  ]);

  const toolkitCore = Boolean(toolkitModule);

  const env = Object.fromEntries(REQUIRED_ENV.map((key) => [key, Boolean(process.env[key])]));
  const writeReadiness = toolkitModule?.checkWriteReadiness ? toolkitModule.checkWriteReadiness() : null;

  return {
    toolkitCore,
    toolkitAgent,
    env,
    writeReadiness,
    ready: {
      bundle: true,
      dryRun: toolkitCore && toolkitAgent,
      liveRead: toolkitCore && toolkitAgent,
      liveWrite: toolkitCore && toolkitAgent && Boolean(writeReadiness?.canWrite),
    },
  };
}

export function resolveStarterMode(explicitMode, capabilities, defaults = {}) {
  const mode = explicitMode || defaults.defaultMode || "auto";
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
