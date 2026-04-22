import type { QualityGateResult } from "../../../src/toolkit/publish/quality-gate.js";
import { checkPublishQuality } from "../../../src/toolkit/publish/quality-gate.js";

const DEFAULT_MIN_TEXT_LENGTH = 200;

export interface BuildMarketActionDraftOptions {
  asset: string;
  horizon: string;
  txHash: string;
  currentPrice: number;
  predictedPrice: number;
  sentimentScore: number;
  minTextLength?: number;
}

export interface MarketActionDraftSuccess {
  ok: true;
  category: "ACTION";
  text: string;
  tags: string[];
  qualityGate: QualityGateResult;
  thesis: string;
  falsifier: string;
}

export interface MarketActionDraftFailure {
  ok: false;
  reason: string;
  qualityGate: QualityGateResult;
  text: string;
  thesis: string;
  falsifier: string;
}

export type MarketActionDraftResult = MarketActionDraftSuccess | MarketActionDraftFailure;

export function buildMarketActionDraft(
  opts: BuildMarketActionDraftOptions,
): MarketActionDraftResult {
  const asset = opts.asset.trim().toUpperCase();
  const horizon = opts.horizon.trim();
  const currentPrice = opts.currentPrice;
  const predictedPrice = opts.predictedPrice;
  const sentimentScore = Math.round(opts.sentimentScore);
  const direction = predictedPrice >= currentPrice ? "above" : "below";
  const falsifierDirection = direction === "above" ? "below" : "above";
  const thesis = predictedPrice >= currentPrice
    ? "active fixed-price flow still favors upside resolution."
    : "active fixed-price flow still favors downside resolution.";
  const falsifier = `${asset} trades ${falsifierDirection} ${formatPrice(
    deriveFalsifierPrice(currentPrice, predictedPrice),
  )} before the ${horizon} window ends.`;
  const text = `ACTION: placed ${asset} ${horizon} fixed-price bet via ${shortTxHash(opts.txHash)} on close ${direction} ${formatPrice(predictedPrice)} vs spot ${formatPrice(currentPrice)} with oracle sentiment ${formatSignedScore(sentimentScore)}. Thesis: ${thesis} Falsifier: ${falsifier}`;
  const qualityGate = checkPublishQuality(
    { text, category: "ACTION" },
    { minTextLength: opts.minTextLength ?? DEFAULT_MIN_TEXT_LENGTH },
  );

  if (!qualityGate.pass) {
    return {
      ok: false,
      reason: "draft_quality_gate_failed",
      qualityGate,
      text,
      thesis,
      falsifier,
    };
  }

  return {
    ok: true,
    category: "ACTION",
    text,
    tags: [
      "market",
      "action",
      asset.toLowerCase(),
      "fixed-price",
      horizon.toLowerCase(),
    ],
    qualityGate,
    thesis,
    falsifier,
  };
}

function deriveFalsifierPrice(currentPrice: number, predictedPrice: number): number {
  const base = predictedPrice >= currentPrice ? currentPrice * 0.995 : currentPrice * 1.005;
  return Math.max(1, base);
}

function shortTxHash(txHash: string): string {
  if (txHash.length <= 14) return txHash;
  return `${txHash.slice(0, 6)}…${txHash.slice(-4)}`;
}

function formatPrice(value: number): string {
  const rounded = Math.round(value);
  return rounded.toLocaleString("en-US");
}

function formatSignedScore(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}
