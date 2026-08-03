/**
 * Typed validation issues.
 *
 * Document 14 §4 requires commands to return typed error codes that the UI maps to
 * accessible copy, and forbids surfacing raw provider or HTTP error text. The `message`
 * here is an engineer-facing description for logs and tests; UI copy is chosen by the
 * consuming app from `code` and `path`, never by string-matching `message`.
 */

import { type CapsuleDraft } from './types.js';

export const CAPSULE_ISSUE_CODES = [
  /** Input was not parseable JSON. */
  'invalid_json',
  /** Two conflicting definitions of the same top-level key (Document 10 §4.1). */
  'duplicate_key',
  /** A key that could corrupt an object prototype was present. */
  'unsafe_key',
  /** Input exceeded a size limit before parsing or rendering (Document 10 §4.2). */
  'payload_too_large',
  /** Root value was not a JSON object. */
  'not_an_object',
  /** Root contained a field outside the canonical contract (strict mode only). */
  'unknown_field',
  /** A required field was absent. */
  'missing_field',
  /** A field was present with the wrong JSON type. */
  'wrong_type',
  /** A required string was empty after normalization. */
  'empty_value',
  /** A string or list exceeded its bound. */
  'too_long',
  /** A list had more items than its bound. */
  'too_many_items',
  /** A list had fewer items than required. */
  'too_few_items',
  /** A string did not match its required format (UUID, RFC3339, URL). */
  'invalid_format',
  /** A value was outside its permitted enum. */
  'invalid_enum',
  /** A number was outside its permitted range. */
  'out_of_range',
  /** Text contained control characters or lone surrogates (Document 10 §4.4). */
  'unsafe_text',
  /** A URL used a scheme that can carry executable behaviour (Document 10 §10). */
  'unsafe_url_scheme',
  /** Excerpt presence contradicted the declared excerpt status (Document 10 §5). */
  'inconsistent_source',
  /** `updatedAt` was earlier than `createdAt`. */
  'timestamp_order',
  /** Schema version is absent, malformed, or outside the supported range. */
  'unsupported_schema_version',
  /** An extensions key was not namespaced, or shadowed a canonical field. */
  'invalid_extension_namespace',
  /** A Markdown `##` section did not map to a capsule field (Document 10 §6). */
  'unknown_section',
  /** The same Markdown section appeared more than once (Document 10 §6). */
  'ambiguous_section',
] as const;

export type CapsuleIssueCode = (typeof CAPSULE_ISSUE_CODES)[number];

export type CapsuleIssueSeverity = 'error' | 'warning';

export interface CapsuleIssue {
  readonly code: CapsuleIssueCode;
  /** Dotted path to the offending value, e.g. `source.provider` or `files.2.path`. */
  readonly path: string;
  readonly message: string;
  readonly severity: CapsuleIssueSeverity;
}

export function error(code: CapsuleIssueCode, path: string, message: string): CapsuleIssue {
  return { code, path, message, severity: 'error' };
}

export function warning(code: CapsuleIssueCode, path: string, message: string): CapsuleIssue {
  return { code, path, message, severity: 'warning' };
}

export function hasErrors(issues: readonly CapsuleIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

/**
 * Outcome of validating untrusted input.
 *
 * On failure a best-effort `draft` is returned so the import review UI can show the
 * user what was recoverable. The draft is explicitly not a capsule; the type system
 * prevents it being persisted or projected as one (Document 10 §4.6).
 */
export type CapsuleValidationOutcome<T> =
  | { readonly ok: true; readonly capsule: T; readonly warnings: readonly CapsuleIssue[] }
  | {
      readonly ok: false;
      readonly issues: readonly CapsuleIssue[];
      readonly draft: CapsuleDraft;
    };
