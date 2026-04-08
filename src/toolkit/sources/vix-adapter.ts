export function parseVixCsv(responseBody: string): { close: number; date: string } | null {
  if (responseBody.trim() === "") {
    return null;
  }

  const lines = responseBody.split(/\r?\n/);
  if (lines.length < 2) {
    return null;
  }

  let lastDataRow: string | null = null;
  for (let index = lines.length - 1; index >= 1; index -= 1) {
    const line = lines[index]?.trim();
    if (line) {
      lastDataRow = line;
      break;
    }
  }

  if (lastDataRow === null) {
    return null;
  }

  const columns = lastDataRow.split(",").map((value) => value.trim());
  if (columns.length < 5) {
    return null;
  }

  const date = columns[0];
  const close = Number.parseFloat(columns[4]);

  if (date === "" || !Number.isFinite(close)) {
    return null;
  }

  return { close, date };
}
