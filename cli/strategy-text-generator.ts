import { generatePost, type LLMConfig, type GeneratePostInput } from "../src/actions/llm.js";
import type { LLMProvider } from "../src/lib/llm/llm-provider.js";
import type { StrategyAction } from "../src/toolkit/strategy/types.js";

function getTopics(action: StrategyAction): string[] {
  const topics = action.metadata?.topics;
  if (!Array.isArray(topics)) return [];
  return topics.filter((topic): topic is string => typeof topic === "string");
}

function getAuthor(action: StrategyAction): string {
  const author = action.metadata?.author;
  return typeof author === "string" ? author : "unknown";
}

/**
 * Create a generateText callback for the action executor.
 * Adapts StrategyAction metadata into GeneratePostInput for the existing LLM pipeline.
 */
export function createStrategyTextGenerator(
  provider: LLMProvider,
  llmConfig: LLMConfig,
): (action: StrategyAction) => Promise<string> {
  return async (action: StrategyAction): Promise<string> => {
    const topics = getTopics(action);

    const input: GeneratePostInput = {
      topic:
        action.type === "REPLY"
          ? topics[0] ?? "discussion"
          : action.target ?? topics[0] ?? "analysis",
      category: action.type === "REPLY" ? "discussion" : "analysis",
      scanContext: {
        activity_level: "moderate",
        posts_per_hour: 0,
        gaps: topics,
      },
      calibrationOffset: 0,
      ...(action.type === "REPLY"
        ? {
            replyTo: {
              txHash: action.target ?? "",
              author: getAuthor(action),
              text: action.reason,
            },
          }
        : {}),
      ...(action.evidence?.[0]
        ? {
            attestedData: {
              source: action.evidence[0],
              url: "",
              summary: action.reason,
            },
          }
        : {}),
    };

    try {
      const draft = await generatePost(input, provider, llmConfig);
      return draft.text;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate text for ${action.type} action: ${message}`);
    }
  };
}
