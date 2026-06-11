export function uniqueStrings<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function uniqueNonEmptyStrings(values: string[]): string[] {
  return uniqueStrings(values.filter((value) => value.length > 0));
}
