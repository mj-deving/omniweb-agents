export interface UntrustedText {
  readonly label: "untrusted_colony_post_text";
  readonly text: string;
  readonly truncated: boolean;
}

export function truncateText(text: string, maxChars = 360): UntrustedText {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) {
    return { label: "untrusted_colony_post_text", text: normalized, truncated: false };
  }
  return {
    label: "untrusted_colony_post_text",
    text: `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`,
    truncated: true,
  };
}

export function firstWords(text: string, count: number): string {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).slice(0, count).join(" ");
}
