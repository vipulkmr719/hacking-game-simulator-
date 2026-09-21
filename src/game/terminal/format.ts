/**
 * Terminal text layout.
 *
 * Column alignment lives here rather than in each command so output reads as
 * one system. Columns are kept narrow on purpose: a terminal at 320px wraps,
 * and a wrapped wide table is harder to read than a narrow one.
 */

export function pad(text: string, width: number): string {
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

export function indent(text: string, depth = 1): string {
  return `${'  '.repeat(depth)}${text}`;
}

/**
 * Lays out rows in aligned columns. The last column is not padded, so trailing
 * whitespace never reaches the DOM.
 */
export function formatTable(rows: readonly (readonly string[])[]): readonly string[] {
  if (rows.length === 0) {
    return [];
  }

  const columnCount = Math.max(...rows.map((row) => row.length));
  const widths: number[] = [];
  for (let column = 0; column < columnCount; column += 1) {
    widths.push(Math.max(...rows.map((row) => (row[column] ?? '').length)));
  }

  return rows.map((row) =>
    row
      .map((cell, column) => (column === row.length - 1 ? cell : pad(cell, widths[column] ?? 0)))
      .join('  ')
      .trimEnd(),
  );
}

/** Key/value detail block, e.g. "  Address      192.0.2.10". */
export function formatDetail(entries: readonly (readonly [string, string])[]): readonly string[] {
  const width = Math.max(0, ...entries.map(([label]) => label.length));
  return entries.map(([label, value]) => indent(`${pad(label, width)}  ${value}`));
}
