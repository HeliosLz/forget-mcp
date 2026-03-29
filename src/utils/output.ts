const useJson = process.argv.includes("--json");

export function info(msg: string): void {
  if (useJson) return;
  console.log(msg);
}

export function success(msg: string): void {
  if (useJson) return;
  console.log(`✓ ${msg}`);
}

export function warn(msg: string): void {
  if (useJson) return;
  console.error(`⚠ ${msg}`);
}

export function error(msg: string): void {
  if (useJson) return;
  console.error(`✗ ${msg}`);
}

export function json(data: unknown): void {
  if (useJson) {
    console.log(JSON.stringify(data, null, 2));
  }
}

export function table(headers: string[], rows: string[][]): void {
  if (useJson) return;
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] || "").length))
  );
  const sep = widths.map((w) => "─".repeat(w + 2)).join("┼");
  const fmt = (row: string[]) =>
    row.map((c, i) => ` ${(c || "").padEnd(widths[i])} `).join("│");

  console.log(fmt(headers));
  console.log(sep);
  rows.forEach((r) => console.log(fmt(r)));
}
