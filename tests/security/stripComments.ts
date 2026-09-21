/**
 * Removes comments from TypeScript/TSX source.
 *
 * The boundary scan checks whether forbidden APIs are *used*. Without this, a
 * comment explaining why an API is banned reads as a violation of the ban —
 * which would push authors to stop documenting the rules in order to keep the
 * suite green. Stripping comments makes the scan more precise, not weaker:
 * comments cannot execute.
 *
 * Quote and template tracking exists so a string containing "//" is not
 * mistaken for the start of a comment.
 */
export function stripComments(source: string): string {
  let out = '';
  let index = 0;
  let quote: string | null = null;

  while (index < source.length) {
    const char = source[index] ?? '';
    const next = source[index + 1] ?? '';

    if (quote !== null) {
      out += char;
      if (char === '\\') {
        out += next;
        index += 2;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      out += char;
      index += 1;
      continue;
    }

    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') {
        index += 1;
      }
      continue;
    }

    if (char === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        index += 1;
      }
      index += 2;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}
