/**
 * Text normalization and safety primitives (Document 10 §4.3–§4.4).
 *
 * All capsule text passes through here before it is validated, stored, exported, or
 * rendered. The rules are deliberately conservative: capsule content originates from a
 * hostile provider DOM or an untrusted imported file (Document 11).
 */

/**
 * C0 controls that are permitted because they are ordinary text formatting.
 * Everything else in C0, plus DEL and the C1 block, is rejected rather than stripped —
 * silently deleting bytes from a user's context would be a quiet data change.
 */
const ALLOWED_CONTROL_CHARS = new Set(['\n', '\t']);

/** The parts of a parsed URL this module reads. */
export interface ParsedHttpUrl {
  readonly protocol: string;
  readonly origin: string;
  readonly pathname: string;
}

interface Utf8Encoder {
  encode(input: string): Uint8Array;
}

/**
 * `TextEncoder` and `URL` are WHATWG globals present in every runtime this package
 * targets — the MV3 service worker, an extension page, the optional dashboard, and the
 * Node test process — but TypeScript only ships their types inside `lib.dom` and
 * `@types/node`. capsule-schema loads neither, because pulling in either would also
 * grant `fetch`, `localStorage`, `document`, or `process` to a package that must stay
 * platform-neutral (Document 14 §2).
 *
 * Reading them off `globalThis` through a narrow local interface keeps the dependency
 * explicit and auditable: adding a new platform global means editing this block, not
 * silently inheriting one. This mirrors `findRandomUuidSource` in `operations.ts`.
 */
interface PlatformGlobals {
  readonly TextEncoder: new () => Utf8Encoder;
  readonly URL: new (input: string) => ParsedHttpUrl;
}

const platform = globalThis as unknown as PlatformGlobals;

/**
 * Normalize a text value.
 *
 * Order matters: line endings first so that CRLF becomes a single LF before trimming,
 * then NFC so that visually identical strings compare and hash identically, then outer
 * trim. Internal formatting (indentation, blank lines inside code blocks) is preserved.
 */
export function normalizeText(input: string): string {
  return input.replace(/\r\n?/g, '\n').normalize('NFC').trim();
}

/** Normalize without trimming — for excerpt turns where leading indent can be meaningful. */
export function normalizeTextPreservingIndent(input: string): string {
  return input.replace(/\r\n?/g, '\n').normalize('NFC');
}

/**
 * True when the string contains a control character outside the allowed set.
 * Checked after normalization so that CR has already been folded into LF.
 */
export function hasUnsafeControlCharacters(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    const isC0 = code <= 0x1f;
    const isDelOrC1 = code >= 0x7f && code <= 0x9f;
    if ((isC0 || isDelOrC1) && !ALLOWED_CONTROL_CHARS.has(char)) {
      return true;
    }
  }
  return false;
}

/**
 * True when the string contains an unpaired surrogate.
 *
 * Lone surrogates survive JSON parsing but cannot be encoded to UTF-8, so they would
 * fail later at export, sync, or hashing. Rejecting at the boundary keeps the failure
 * where the user can act on it.
 */
export function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const isHigh = code >= 0xd800 && code <= 0xdbff;
    const isLow = code >= 0xdc00 && code <= 0xdfff;
    if (isHigh) {
      const next = value.charCodeAt(index + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (isLow) {
      return true;
    }
  }
  return false;
}

/** True when the string is safe to store and render as capsule text. */
export function isSafeText(value: string): boolean {
  return !hasUnsafeControlCharacters(value) && !hasLoneSurrogate(value);
}

const utf8Encoder = new platform.TextEncoder();

/** UTF-8 byte length. Size limits are byte limits, not character counts. */
export function byteLength(value: string): number {
  return utf8Encoder.encode(value).length;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Accepts a lowercase RFC 9562 UUID of any current version. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

const RFC3339_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

/**
 * Accepts an RFC3339 UTC timestamp. Offsets other than `Z` are rejected so that stored
 * timestamps sort correctly as strings and compare without a timezone database.
 */
export function isRfc3339Utc(value: string): boolean {
  if (!RFC3339_UTC_PATTERN.test(value)) return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  // Rejects values that match the shape but are not real dates, e.g. 2026-02-31.
  return new Date(parsed).toISOString().slice(0, 19) === value.slice(0, 19);
}

/** Canonical timestamp form used everywhere the product writes a time. */
export function toRfc3339Utc(date: Date): string {
  return date.toISOString();
}

const SAFE_URL_SCHEMES = new Set(['http:', 'https:']);

/**
 * Parse a conversation URL, rejecting any scheme that can carry executable behaviour
 * such as `javascript:` or `data:` (Document 10 §10).
 */
export function parseSafeHttpUrl(value: string): ParsedHttpUrl | null {
  let url: ParsedHttpUrl;
  try {
    url = new platform.URL(value);
  } catch {
    return null;
  }
  return SAFE_URL_SCHEMES.has(url.protocol) ? url : null;
}

/**
 * Query parameters and fragments on provider conversation URLs can carry share tokens
 * or session identifiers. Export keeps the origin and path — enough for a human to
 * recognise the conversation — and drops the rest (Document 10 §10).
 */
export function redactConversationUrl(value: string): string | null {
  const url = parseSafeHttpUrl(value);
  if (!url) return null;
  return `${url.origin}${url.pathname}`;
}
