export interface CliError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

export interface CliEnvelopeBase {
  readonly ok: boolean;
  readonly command: string;
  readonly version: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly warnings?: string[];
  readonly next?: unknown;
}

export interface CliSuccessEnvelope<T> extends CliEnvelopeBase {
  readonly ok: true;
  readonly data: T;
}

export interface CliErrorEnvelope extends CliEnvelopeBase {
  readonly ok: false;
  readonly error: CliError;
}

export type CliEnvelope<T = unknown> = CliSuccessEnvelope<T> | CliErrorEnvelope;

export function successEnvelope<T>(opts: {
  command: string;
  version: string;
  startedAt: string;
  finishedAt: string;
  data: T;
  warnings?: string[];
  next?: unknown;
}): CliSuccessEnvelope<T> {
  return {
    ok: true,
    command: opts.command,
    version: opts.version,
    startedAt: opts.startedAt,
    finishedAt: opts.finishedAt,
    data: opts.data,
    ...(opts.warnings && opts.warnings.length > 0 ? { warnings: opts.warnings } : {}),
    ...(opts.next !== undefined ? { next: opts.next } : {}),
  };
}

export function errorEnvelope(opts: {
  command: string;
  version: string;
  startedAt: string;
  finishedAt: string;
  error: CliError;
  warnings?: string[];
  next?: unknown;
}): CliErrorEnvelope {
  return {
    ok: false,
    command: opts.command,
    version: opts.version,
    startedAt: opts.startedAt,
    finishedAt: opts.finishedAt,
    error: opts.error,
    ...(opts.warnings && opts.warnings.length > 0 ? { warnings: opts.warnings } : {}),
    ...(opts.next !== undefined ? { next: opts.next } : {}),
  };
}
