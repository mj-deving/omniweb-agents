import { runResearchAgentMinimal } from "../dist/research-agent-minimal.js";

const skipLiveRead = process.argv.includes("--skip-live-read");

const summary = await runResearchAgentMinimal({ skipLiveRead });
console.log(JSON.stringify(summary, null, 2));
