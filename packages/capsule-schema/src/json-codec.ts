/**
 * Canonical JSON codec (Document 10 §2, §4.1–§4.2, §9).
 *
 * `serializeCapsuleJson` and `parseCapsuleJson` are inverses: serializing a capsule and
 * parsing the result yields an equivalent capsule. Privacy transformations such as URL
 * redaction are deliberately *not* folded into serialization — see
 * `redactCapsuleForExport` in `operations.ts`. A codec that silently altered content
 * would make round-trip equivalence untestable and hide data changes from the user.
 */

import { type CapsuleIssue, type CapsuleValidationOutcome, error } from './issues.js';
import { CAPSULE_LIMITS } from './limits.js';
import { byteLength } from './text.js';
import { CANONICAL_FIELD_ORDER, type Capsule } from './types.js';
import { validateCapsule, type ValidateOptions } from './validate.js';

export interface ParseCapsuleJsonOptions extends ValidateOptions {
  /** Overrides the default 1 MB import ceiling — used by the 256 KB sync path. */
  readonly maxBytes?: number;
}

/**
 * Serialize a capsule in canonical field order with a trailing newline.
 *
 * Field order is fixed rather than insertion-dependent so that exports are byte-stable.
 * That makes file diffs meaningful and lets the optional 1B sync path hash a payload
 * for idempotency without the hash changing for a semantically identical capsule.
 */
export function serializeCapsuleJson(capsule: Capsule): string {
  const ordered: Record<string, unknown> = {};
  for (const field of CANONICAL_FIELD_ORDER) {
    const value = capsule[field];
    if (value === undefined) continue;
    ordered[field] = value;
  }
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

const JSON_WHITESPACE: ReadonlySet<string> = new Set([' ', '\t', '\n', '\r']);

/** Index of the closing quote of the string starting at `start`, or -1 if unterminated. */
function scanStringEnd(text: string, start: number): number {
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (char === '\\') {
      index += 1;
      continue;
    }
    if (char === '"') return index;
  }
  return -1;
}

/**
 * Find top-level keys that appear more than once (Document 10 §4.1).
 *
 * `JSON.parse` silently keeps the last occurrence of a duplicated key, so a crafted file
 * could show a reviewer one `goal` while the parser stores another. Detecting this
 * requires reading the raw text before parsing.
 *
 * Only depth-1 keys are checked, which is what the specification requires. Keys are
 * compared after unescaping so that `"a"` and `"a"` are recognised as the same key.
 */
export function findDuplicateTopLevelKeys(text: string): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  let depth = 0;
  let index = 0;

  while (index < text.length) {
    const char = text.charAt(index);

    if (char === '"') {
      const end = scanStringEnd(text, index);
      // Unterminated string: leave the diagnosis to JSON.parse.
      if (end === -1) break;

      if (depth === 1) {
        let peek = end + 1;
        while (peek < text.length && JSON_WHITESPACE.has(text.charAt(peek))) peek += 1;
        if (text.charAt(peek) === ':') {
          let key: unknown;
          try {
            key = JSON.parse(text.slice(index, end + 1));
          } catch {
            key = undefined;
          }
          if (typeof key === 'string') {
            if (seen.has(key)) duplicates.add(key);
            else seen.add(key);
          }
        }
      }
      index = end + 1;
      continue;
    }

    if (char === '{' || char === '[') depth += 1;
    else if (char === '}' || char === ']') depth -= 1;
    index += 1;
  }

  return [...duplicates];
}

/**
 * Parse and validate untrusted capsule JSON text.
 *
 * Order is deliberate: size, then duplicate keys, then parse, then validate. Each stage
 * is cheaper and more hostile-input-resistant than the next, so an oversized or crafted
 * file is rejected before it reaches the parser.
 */
export function parseCapsuleJson(
  text: string,
  options: ParseCapsuleJsonOptions = {},
): CapsuleValidationOutcome<Capsule> {
  const maxBytes = options.maxBytes ?? CAPSULE_LIMITS.maxImportBytes;

  const size = byteLength(text);
  if (size > maxBytes) {
    return {
      ok: false,
      issues: [
        error(
          'payload_too_large',
          '',
          `File is ${String(size)} bytes, which exceeds the ${String(maxBytes)} byte limit.`,
        ),
      ],
      draft: {},
    };
  }

  const duplicates = findDuplicateTopLevelKeys(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      issues: [error('invalid_json', '', 'File is not valid JSON.')],
      draft: {},
    };
  }

  const outcome = validateCapsule(parsed, options);

  if (duplicates.length === 0) return outcome;

  // A duplicate key is always fatal: the file states two different values for the same
  // field, so there is no honest way to show the user which one they are importing.
  const duplicateIssues: CapsuleIssue[] = duplicates.map((key) =>
    error('duplicate_key', key, `Field "${key}" is defined more than once.`),
  );

  return outcome.ok
    ? { ok: false, issues: duplicateIssues, draft: outcome.capsule }
    : { ok: false, issues: [...duplicateIssues, ...outcome.issues], draft: outcome.draft };
}
