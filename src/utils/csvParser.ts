/* ─── CSV parser with quoted-field support ─── */

export function parseCSV(text: string): {
  headers: string[];
  rows: string[][];
} {
  const lines = text
    .trim()
    .split("\n")
    .filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };

  const parse = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) {
        result.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    result.push(cur.trim());
    return result;
  };

  return { headers: parse(lines[0]), rows: lines.slice(1, 101).map(parse) };
}
