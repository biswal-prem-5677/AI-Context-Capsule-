import { describe, expect, it } from 'vitest';

import {
  byteLength,
  hasLoneSurrogate,
  hasUnsafeControlCharacters,
  isRfc3339Utc,
  isSafeText,
  isUuid,
  normalizeText,
  normalizeTextPreservingIndent,
  parseSafeHttpUrl,
  redactConversationUrl,
  toRfc3339Utc,
} from './text.js';

/**
 * Built from code points rather than written literally. Control characters and lone
 * surrogates do not survive editors, diffs, or copy-paste intact, and a test that
 * silently loses its hostile input would pass while proving nothing.
 */
const char = (code: number): string => String.fromCharCode(code);

const NUL = char(0x00);
const ESCAPE = char(0x1b);
const VERTICAL_TAB = char(0x0b);
const CARRIAGE_RETURN = char(0x0d);
const DELETE = char(0x7f);
const C1_NEXT_LINE = char(0x85);
const COMBINING_ACUTE = char(0x0301);
const HIGH_SURROGATE = char(0xd800);
const LOW_SURROGATE = char(0xdc00);
const SMILING_FACE = String.fromCodePoint(0x1f642);

describe('normalizeText', () => {
  it('folds CRLF and lone CR into LF', () => {
    expect(normalizeText(`a${CARRIAGE_RETURN}\nb${CARRIAGE_RETURN}c`)).toBe('a\nb\nc');
  });

  it('applies NFC so equivalent strings compare and hash identically', () => {
    const decomposed = `cafe${COMBINING_ACUTE}`;
    const composed = char(0x63) + char(0x61) + char(0x66) + char(0xe9);
    expect(decomposed).not.toBe(composed);
    expect(normalizeText(decomposed)).toBe(composed);
  });

  it('trims outer whitespace but preserves internal formatting', () => {
    expect(normalizeText('  line one\n\n    indented\n  ')).toBe('line one\n\n    indented');
  });

  it('returns an empty string for whitespace-only input', () => {
    expect(normalizeText('   \n\t  ')).toBe('');
  });

  it('preserves leading indentation when asked to', () => {
    expect(normalizeTextPreservingIndent(`    code()${CARRIAGE_RETURN}\n`)).toBe('    code()\n');
  });
});

describe('hasUnsafeControlCharacters', () => {
  it('allows newline and tab', () => {
    expect(hasUnsafeControlCharacters('line\n\tindented')).toBe(false);
  });

  it.each([
    ['null byte', NUL],
    ['escape', ESCAPE],
    ['vertical tab', VERTICAL_TAB],
    ['carriage return', CARRIAGE_RETURN],
    ['delete', DELETE],
    ['C1 next-line', C1_NEXT_LINE],
  ])('rejects %s', (_name, control) => {
    expect(hasUnsafeControlCharacters(`text${control}text`)).toBe(true);
  });

  it('allows ordinary Unicode content', () => {
    expect(hasUnsafeControlCharacters(`日本語 — emoji ${SMILING_FACE}`)).toBe(false);
  });
});

describe('hasLoneSurrogate', () => {
  it('accepts a well-formed surrogate pair', () => {
    expect(hasLoneSurrogate(SMILING_FACE)).toBe(false);
  });

  it('rejects an unpaired high surrogate', () => {
    expect(hasLoneSurrogate(`a${HIGH_SURROGATE}b`)).toBe(true);
  });

  it('rejects an unpaired low surrogate', () => {
    expect(hasLoneSurrogate(`a${LOW_SURROGATE}b`)).toBe(true);
  });

  it('rejects a high surrogate at end of string', () => {
    expect(hasLoneSurrogate(`a${HIGH_SURROGATE}`)).toBe(true);
  });

  it('accepts an empty string', () => {
    expect(hasLoneSurrogate('')).toBe(false);
  });
});

describe('isSafeText', () => {
  it('combines the control-character and surrogate checks', () => {
    expect(isSafeText('ordinary text')).toBe(true);
    expect(isSafeText(`bad${NUL}value`)).toBe(false);
    expect(isSafeText(`bad${HIGH_SURROGATE}value`)).toBe(false);
  });
});

describe('byteLength', () => {
  it('counts UTF-8 bytes rather than UTF-16 code units', () => {
    expect(byteLength('abc')).toBe(3);
    expect(byteLength(char(0xe9))).toBe(2);
    expect(byteLength(SMILING_FACE)).toBe(4);
  });
});

describe('isUuid', () => {
  it('accepts a lowercase v4 UUID', () => {
    expect(isUuid('bd5d4d75-8cab-4f70-91d8-77bb7d3f5a81')).toBe(true);
  });

  it.each([
    ['uppercase', 'BD5D4D75-8CAB-4F70-91D8-77BB7D3F5A81'],
    ['nil UUID', '00000000-0000-0000-0000-000000000000'],
    ['missing section', 'bd5d4d75-8cab-4f70-91d8'],
    ['free text', 'not-a-uuid'],
    ['empty', ''],
  ])('rejects %s', (_name, value) => {
    expect(isUuid(value)).toBe(false);
  });
});

describe('isRfc3339Utc', () => {
  it.each([
    ['with milliseconds', '2026-07-29T00:00:00.000Z'],
    ['without milliseconds', '2026-07-29T00:00:00Z'],
  ])('accepts %s', (_name, value) => {
    expect(isRfc3339Utc(value)).toBe(true);
  });

  it.each([
    ['a numeric offset', '2026-07-29T00:00:00+00:00'],
    ['a local time', '2026-07-29T00:00:00'],
    ['a date only', '2026-07-29'],
    ['an impossible date', '2026-02-31T00:00:00Z'],
    ['a month of 13', '2026-13-01T00:00:00Z'],
    ['free text', 'yesterday'],
    ['empty', ''],
  ])('rejects %s', (_name, value) => {
    expect(isRfc3339Utc(value)).toBe(false);
  });

  it('round-trips values produced by toRfc3339Utc', () => {
    const stamp = toRfc3339Utc(new Date(Date.UTC(2026, 6, 29, 12, 34, 56)));
    expect(stamp).toBe('2026-07-29T12:34:56.000Z');
    expect(isRfc3339Utc(stamp)).toBe(true);
  });
});

describe('parseSafeHttpUrl', () => {
  it.each([
    ['https', 'https://chatgpt.com/c/abc'],
    ['http', 'http://localhost:3000/x'],
  ])('accepts %s', (_name, value) => {
    expect(parseSafeHttpUrl(value)).not.toBeNull();
  });

  it.each([
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/html,<script>alert(1)</script>'],
    ['file', 'file:///etc/passwd'],
    ['ftp', 'ftp://example.com/x'],
    ['relative path', '/c/abc'],
    ['free text', 'not a url'],
  ])('rejects %s', (_name, value) => {
    expect(parseSafeHttpUrl(value)).toBeNull();
  });
});

describe('redactConversationUrl', () => {
  it('drops query strings and fragments that can carry share tokens', () => {
    expect(redactConversationUrl('https://chatgpt.com/c/abc?share=secret#section')).toBe(
      'https://chatgpt.com/c/abc',
    );
  });

  it('leaves a clean URL unchanged', () => {
    expect(redactConversationUrl('https://claude.ai/chat/abc')).toBe('https://claude.ai/chat/abc');
  });

  it('returns null for a URL it cannot safely parse', () => {
    expect(redactConversationUrl('javascript:alert(1)')).toBeNull();
  });
});
