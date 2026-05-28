export function hasFlag(args: string[], flag: string, alias?: string): boolean {
  return args.includes(flag) || (alias ? args.includes(alias) : false);
}

export function getStringArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  return args[index + 1];
}

export function getNumberArg(args: string[], flag: string): number | undefined {
  const raw = getStringArg(args, flag);
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
