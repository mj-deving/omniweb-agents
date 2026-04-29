import { detectCapabilities, resolveStarterMode, summarizeCapabilities } from "./runtime/capability-detect.mjs";

async function main(): Promise<void> {
  const capabilities = await detectCapabilities();
  const mode = resolveStarterMode(process.env.OMNIWEB_STARTER_MODE, capabilities, {
    autoWhenDryRunReady: "dry-run",
  });

  console.log(`Capabilities: ${summarizeCapabilities(capabilities)}`);
  console.log(`Selected mode: ${mode}\n`);

  if (mode === "bundle") {
    console.log("Bundle mode only. No OmniWeb runtime imported.");
    console.log("Use this to inspect the skill, docs, and capability tiers before touching live state.");
    return;
  }

  if (!capabilities.ready.dryRun) {
    console.log("Dry-run runtime is not ready. Missing omniweb-toolkit package support.");
    console.log("Stay in bundle mode until the optional runtime deps are installed.");
    return;
  }

  const liveModule = await import("./runtime/live-research-starter.ts");

  if (mode === "live-write") {
    if (!capabilities.ready.liveWrite) {
      throw new Error("live-write mode requested, but wallet/runtime prerequisites are not ready");
    }
    await liveModule.runStarter({ dryRun: false });
    return;
  }

  await liveModule.runStarter({ dryRun: true });
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
