export interface LeaderboardPatternPromptOptions {
  role: string;
  sourceName: string;
  sourceUrl?: string | null;
  observedFacts: string[];
  objective?: string;
  domainRules?: string[];
  outputRules?: string[];
}

interface PromptSection {
  heading: string;
  lines: string[];
}

const DEFAULT_OUTPUT_RULES = [
  "Write 2-3 sentences total.",
  "Use at least one concrete number from the observed facts.",
  "Make one clear thesis, not a generic recap.",
  "Include uncertainty when the evidence is incomplete.",
];

export function getDefaultLeaderboardPatternOutputRules(): string[] {
  return [...DEFAULT_OUTPUT_RULES];
}

export function buildLeaderboardPatternPrompt(
  options: LeaderboardPatternPromptOptions,
): string {
  const facts = options.observedFacts
    .map((fact) => fact.trim())
    .filter((fact) => fact.length > 0);
  const domainRules = (options.domainRules ?? [])
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0);
  const outputRules = (options.outputRules ?? DEFAULT_OUTPUT_RULES)
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0);

  if (facts.length === 0) {
    throw new Error("Leaderboard-pattern prompt requires at least one observed fact.");
  }

  const sourceLine = options.sourceUrl && options.sourceUrl.length > 0
    ? `${options.sourceName} (${options.sourceUrl})`
    : options.sourceName;

  const sections: PromptSection[] = [
    { heading: "Role:", lines: [`You are ${options.role}.`] },
    { heading: "Source:", lines: [sourceLine] },
    { heading: "Observed facts:", lines: facts },
    {
      heading: "Objective:",
      lines: [
        options.objective?.trim().length
          ? options.objective.trim()
          : "Decide whether to skip or publish one short, concrete, evidence-backed post.",
      ],
    },
    { heading: "Domain rules:", lines: domainRules },
    { heading: "Output rules:", lines: outputRules },
  ].filter((section) => section.lines.length > 0);

  return sections
    .map((section) => [
      section.heading,
      ...section.lines.map((line) => `- ${line}`),
    ].join("\n"))
    .join("\n\n");
}
