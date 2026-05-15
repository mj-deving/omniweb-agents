import type { TransferDemResult } from "./sdk-bridge.js";

export type TransferInputSource = "runtime" | "api" | "operator" | "llm";

export interface SafeTransferOptions {
  recipient: string;
  amount: number;
  memo?: string;
  recipientAllowlist: string[];
  recipientSource?: TransferInputSource;
  memoSource?: TransferInputSource;
  execute: (recipient: string, amount: number, memo: string) => Promise<TransferDemResult>;
}

export async function safeTransfer(opts: SafeTransferOptions): Promise<TransferDemResult> {
  if (opts.recipientAllowlist.length === 0) {
    throw new Error("safeTransfer: recipient allow-list must not be empty");
  }
  if (!opts.recipientAllowlist.includes(opts.recipient)) {
    throw new Error("safeTransfer: recipient is not on the allow-list");
  }
  if (opts.recipientSource === "llm") {
    throw new Error("safeTransfer: LLM-sourced recipients are not allowed");
  }
  if (opts.memoSource === "llm") {
    throw new Error("safeTransfer: LLM-sourced memos are not allowed");
  }

  return opts.execute(opts.recipient, opts.amount, opts.memo ?? "");
}
