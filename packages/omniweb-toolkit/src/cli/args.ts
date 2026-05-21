export interface ParsedArgs {
  readonly commandPath: string[];
  readonly options: Record<string, string | boolean>;
}

export class CliUsageError extends Error {
  readonly code = "INVALID_ARGUMENT";

  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const commandPath: string[] = [];
  const options: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (!token.startsWith("--")) {
      commandPath.push(token);
      continue;
    }

    const raw = token.slice(2);
    if (!raw) throw new CliUsageError("Empty option name is not allowed");

    const equalsIndex = raw.indexOf("=");
    if (equalsIndex >= 0) {
      const key = raw.slice(0, equalsIndex);
      const value = raw.slice(equalsIndex + 1);
      if (!key) throw new CliUsageError("Empty option name is not allowed");
      options[key] = value;
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      options[raw] = next;
      i += 1;
      continue;
    }

    options[raw] = true;
  }

  return { commandPath, options };
}

export function optionNumber(
  options: Record<string, string | boolean>,
  name: string,
  fallback: number,
  opts?: { min?: number; integer?: boolean },
): number {
  const raw = options[name];
  if (raw === undefined) return fallback;
  if (typeof raw === "boolean") {
    throw new CliUsageError(`--${name} requires a numeric value`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new CliUsageError(`--${name} must be a finite number`);
  }
  if (opts?.integer !== false && !Number.isInteger(value)) {
    throw new CliUsageError(`--${name} must be an integer`);
  }
  if (opts?.min !== undefined && value < opts.min) {
    throw new CliUsageError(`--${name} must be >= ${opts.min}`);
  }
  return value;
}

export function commandKey(commandPath: readonly string[]): string {
  return commandPath.join(" ");
}
