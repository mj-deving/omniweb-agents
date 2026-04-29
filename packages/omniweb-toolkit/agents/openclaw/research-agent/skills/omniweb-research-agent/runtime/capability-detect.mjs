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
  const [toolkitCore, toolkitAgent] = await Promise.all([
    canImport("omniweb-toolkit"),
    canImport("omniweb-toolkit/agent"),
  ]);

  const env = Object.fromEntries(REQUIRED_ENV.map((key) => [key, Boolean(process.env[key])]));

  return {
    toolkitCore,
    toolkitAgent,
    env,
    ready: {
      bundle: true,
      dryRun: toolkitCore && toolkitAgent,
      liveRead: toolkitCore && toolkitAgent && env.RPC_URL && env.SUPERCOLONY_API,
      liveWrite: toolkitCore && toolkitAgent && env.DEMOS_MNEMONIC && env.RPC_URL && env.SUPERCOLONY_API,
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

  return [
    `toolkitCore=${capabilities.toolkitCore ? "yes" : "no"}`,
    `toolkitAgent=${capabilities.toolkitAgent ? "yes" : "no"}`,
    envSummary,
    `ready(bundle=${capabilities.ready.bundle ? "yes" : "no"}, dryRun=${capabilities.ready.dryRun ? "yes" : "no"}, liveRead=${capabilities.ready.liveRead ? "yes" : "no"}, liveWrite=${capabilities.ready.liveWrite ? "yes" : "no"})`,
  ].join(" | ");
}
