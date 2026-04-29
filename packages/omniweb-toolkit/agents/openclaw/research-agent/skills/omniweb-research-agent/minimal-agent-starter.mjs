import { detectCapabilities, resolveSharedColonyUrl, resolveStarterMode, summarizeCapabilities } from "./runtime/capability-detect.mjs";

function buildBundlePrompt({ totalPosts, signalCount, sourceUrl }) {
  return [
    "Role: colony observer following a lightweight observe-first pattern.",
    `Source: ${sourceUrl}`,
    `Observed facts: Network posts=${totalPosts}; Consensus signals=${signalCount}`,
    "Objective: decide whether a short OBSERVATION post is justified.",
    "Rules: report only what changed, keep it concrete, do not invent numbers, attach an attestUrl before real publish.",
  ].join("\n");
}

async function fetchColonyStats(colonyUrl) {
  const response = await fetch(`${colonyUrl}/api/stats`);
  if (!response.ok) {
    throw new Error(`Stats request failed: ${response.status}`);
  }
  return response.json();
}

async function runBundleMode(colonyUrl) {
  console.log("OmniWeb Minimal Starter — lightweight bundle mode");
  console.log("===============================================\n");

  const sourceUrl = `${colonyUrl}/api/stats`;
  try {
    const stats = await fetchColonyStats(colonyUrl);
    const totalPosts = Number(stats?.network?.totalPosts || 0);
    const signalCount = Number(stats?.consensus?.signalCount || 0);

    console.log("Observed colony stats:");
    console.log(`- network posts: ${totalPosts}`);
    console.log(`- consensus signals: ${signalCount}`);
    console.log("\nPrompt scaffold:\n");
    console.log(buildBundlePrompt({ totalPosts, signalCount, sourceUrl }));
    console.log("\nBundle mode only. No wallet-backed action attempted.");
  } catch (error) {
    console.log(`Could not fetch colony stats: ${error instanceof Error ? error.message : String(error)}`);
    console.log("Staying in bundle mode. You can still inspect the skill, docs, and runtime tiers without heavy deps.");
  }
}

async function main() {
  const capabilities = await detectCapabilities();
  const requestedMode = process.env.OMNIWEB_STARTER_MODE || "auto";
  const mode = resolveStarterMode(requestedMode, capabilities, {
    autoWhenDryRunReady: "dry-run",
  });
  const colonyUrl = await resolveSharedColonyUrl(capabilities);

  console.log(`Capabilities: ${summarizeCapabilities(capabilities)}`);
  console.log(`Selected mode: ${mode}\n`);

  if (requestedMode === "dry-run" && mode === "bundle") {
    console.log("Dry-run requested, but runtime deps are not ready. Degrading to bundle mode instead.");
    console.log("Install the optional omniweb-toolkit runtime deps before using explicit dry-run mode.\n");
  }

  if (mode === "live-write") {
    if (!capabilities.ready.liveWrite) {
      throw new Error("live-write mode requested, but runtime/write prerequisites are not ready");
    }
    const liveModule = await import("./runtime/minimal-live-starter.mjs");
    await liveModule.main();
    return;
  }

  if (mode === "dry-run") {
    const dryRunModule = await import("./runtime/minimal-dry-run-starter.mjs");
    await dryRunModule.main();
    return;
  }

  await runBundleMode(colonyUrl);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
