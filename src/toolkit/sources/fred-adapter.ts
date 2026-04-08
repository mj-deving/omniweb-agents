export interface FredObservation {
  date: string;
  value: string;
}

export interface FredResponse {
  observations: FredObservation[];
}

function isFredObservation(value: unknown): value is FredObservation {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.date === "string" && typeof record.value === "string";
}

function isFredResponse(value: unknown): value is FredResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return Array.isArray(record.observations) && record.observations.every(isFredObservation);
}

export function parseFredResponse(responseBody: string): { value: number; date: string } | null {
  try {
    const parsed: unknown = JSON.parse(responseBody);

    if (!isFredResponse(parsed)) {
      return null;
    }

    for (let index = parsed.observations.length - 1; index >= 0; index -= 1) {
      const observation = parsed.observations[index];
      if (observation.value === ".") {
        continue;
      }

      const value = Number.parseFloat(observation.value);
      if (!Number.isFinite(value)) {
        continue;
      }

      return {
        value,
        date: observation.date,
      };
    }

    return null;
  } catch {
    return null;
  }
}
