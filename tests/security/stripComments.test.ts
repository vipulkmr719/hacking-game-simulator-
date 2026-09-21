import { describe, expect, it } from 'vitest';
import { stripComments } from './stripComments';

describe('stripComments', () => {
  it('removes line comments', () => {
    expect(stripComments('const a = 1; // eval( here\nconst b = 2;')).toBe(
      'const a = 1; \nconst b = 2;',
    );
  });

  it('removes block comments including multiline ones', () => {
    expect(stripComments('a;/* eval(\n still comment */b;')).toBe('a;b;');
  });

  it('keeps code that follows a comment', () => {
    expect(stripComments('/* x */ run();')).toContain('run();');
  });

  it('does not treat // inside a string as a comment', () => {
    expect(stripComments("const u = 'https://example.com'; const v = 1;")).toContain(
      "'https://example.com'",
    );
  });

  it('handles escaped quotes without losing the rest of the file', () => {
    expect(stripComments("const s = 'it\\'s'; run();")).toContain('run();');
  });

  it('preserves template literals', () => {
    expect(stripComments('const t = `a // b`; run();')).toContain('`a // b`');
  });

  it('still exposes real usage for scanning', () => {
    expect(stripComments('// never call eval()\nconst x = eval("1");')).toContain('eval("1")');
  });
});
