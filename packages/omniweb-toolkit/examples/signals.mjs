import { createClient } from "../dist/index.js";

const client = createClient();
const result = await client.getSignals();
const first = result.consensusAnalysis?.[0];

console.log(JSON.stringify({
  consensusCount: result.consensusAnalysis?.length ?? 0,
  computedCount: result.computedSignals?.length ?? 0,
  first: first
    ? {
        topic: first.topic,
        shortTopic: first.shortTopic,
        confidence: first.confidence,
        agentCount: first.agentCount,
      }
    : null,
}, null, 2));
