import { HttpError, ParseError } from "../errors.js";
import type { CliError } from "./envelope.js";

export class CliRuntimeError extends Error {
  readonly cliError: CliError;

  constructor(cliError: CliError) {
    super(cliError.message);
    this.name = "CliRuntimeError";
    this.cliError = cliError;
  }
}

export async function optionalClientResult<T>(
  label: string,
  promise: Promise<T>,
): Promise<{ data?: T; warning?: string }> {
  try {
    return { data: unwrapMaybeApiResult(label, await promise) };
  } catch (error) {
    return { warning: `${label} threw: ${(error as Error).message}` };
  }
}

export function unwrapMaybeApiResult<T>(label: string, result: T): T {
  if (result === null) {
    throw new CliRuntimeError({
      code: "UPSTREAM_EMPTY",
      message: `${label} returned no result`,
      retryable: true,
    });
  }

  if (typeof result === "object" && result !== null && "ok" in result) {
    const apiResult = result as
      | { ok: true; data: T }
      | { ok: false; status?: number; error?: string };
    if (!apiResult.ok) {
      const status = typeof apiResult.status === "number" ? apiResult.status : 0;
      throw new CliRuntimeError({
        code: "UPSTREAM_ERROR",
        message: `${label} failed with status ${status}: ${apiResult.error ?? "unknown error"}`,
        retryable: status === 0 || status >= 500,
      });
    }
    return apiResult.data;
  }

  return result;
}

export function clientError(error: unknown): CliError | null {
  if (error instanceof HttpError) {
    return {
      code: "UPSTREAM_ERROR",
      message: `${error.message} (${error.status})`,
      retryable: error.status === 0 || error.status >= 500,
    };
  }
  if (error instanceof ParseError) {
    return {
      code: "UPSTREAM_PARSE_ERROR",
      message: error.message,
      retryable: true,
    };
  }
  return null;
}
