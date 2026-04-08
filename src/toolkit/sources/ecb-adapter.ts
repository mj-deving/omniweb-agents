interface EcbObservationDimensionValue {
  id: string;
}

interface EcbSeriesEntry {
  observations?: Record<string, unknown>;
}

interface EcbJsonDataResponse {
  dataSets?: Array<{
    series?: Record<string, EcbSeriesEntry>;
  }>;
  structure?: {
    dimensions?: {
      observation?: Array<{
        values?: EcbObservationDimensionValue[];
      }>;
    };
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseObservationValue(observation: unknown): number | null {
  if (!Array.isArray(observation) || observation.length === 0) {
    return null;
  }

  const rawValue = observation[0];
  if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
    return null;
  }

  return rawValue;
}

export function parseEcbJsonData(responseBody: string): { value: number; period: string } | null {
  try {
    const parsed: unknown = JSON.parse(responseBody);
    if (!isRecord(parsed)) {
      return null;
    }

    const response = parsed as EcbJsonDataResponse;
    const dataSet = response.dataSets?.[0];
    if (!dataSet?.series || !isRecord(dataSet.series)) {
      return null;
    }

    const firstSeriesKey = Object.keys(dataSet.series)[0];
    if (firstSeriesKey === undefined) {
      return null;
    }

    const series = dataSet.series[firstSeriesKey];
    if (!series?.observations || !isRecord(series.observations)) {
      return null;
    }

    const sortedObservationKeys = Object.keys(series.observations)
      .map((key) => Number.parseInt(key, 10))
      .filter((key) => Number.isInteger(key) && key >= 0)
      .sort((left, right) => left - right);

    const lastObservationIndex = sortedObservationKeys.at(-1);
    if (lastObservationIndex === undefined) {
      return null;
    }

    const observation = series.observations[String(lastObservationIndex)];
    const value = parseObservationValue(observation);
    if (value === null) {
      return null;
    }

    const period = response.structure?.dimensions?.observation?.[0]?.values?.[lastObservationIndex]?.id;
    if (typeof period !== "string" || period.length === 0) {
      return null;
    }

    return { value, period };
  } catch {
    return null;
  }
}
