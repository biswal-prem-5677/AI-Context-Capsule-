/**
 * Runtime validation and normalization of an untrusted capsule object
 * (Document 10 §4).
 *
 * Every ingress boundary runs this: file import, extension message, storage read, and
 * any future API response (Document 14 §4). Input is treated as hostile.
 *
 * The validator never throws on bad input and never mutates its argument. It returns
 * either a normalized {@link Capsule} or the list of issues plus a best-effort draft.
 */

import {
  type CapsuleIssue,
  type CapsuleValidationOutcome,
  error,
  hasErrors,
  warning,
} from './issues.js';
import { CAPSULE_LIMITS, MIN_PENDING_TASKS } from './limits.js';
import {
  byteLength,
  isRfc3339Utc,
  isSafeText,
  isUuid,
  normalizeText,
  normalizeTextPreservingIndent,
  parseSafeHttpUrl,
} from './text.js';
import {
  CANONICAL_FIELD_NAMES,
  CAPTURE_PROVIDERS,
  EXCERPT_ROLES,
  EXCERPT_STATUSES,
  SCHEMA_VERSION,
  STRING_LIST_FIELDS,
  type Capsule,
  type CapsuleDraft,
  type CapsuleExcerptTurn,
  type CapsuleFileReference,
  type CapsuleSource,
  type CapsuleSourceExcerpt,
  type CaptureProvider,
  type ExcerptRole,
  type ExcerptStatus,
  type StringListField,
} from './types.js';
import { assessSchemaVersion } from './version.js';

/**
 * `strict` rejects unknown root fields. `compatibility` preserves them under
 * {@link UNKNOWN_FIELDS_EXTENSION_KEY} so a capsule written by a newer minor version
 * survives a round trip instead of losing data (Document 10 §4.7).
 */
export type ValidationMode = 'strict' | 'compatibility';

export interface ValidateOptions {
  readonly mode?: ValidationMode;
}

/** Namespace that holds root fields this build did not recognise. */
export const UNKNOWN_FIELDS_EXTENSION_KEY = 'x-unknown';

/**
 * Keys that can corrupt an object prototype if the value is later spread or merged.
 * Rejected outright rather than stripped, so the user sees that the file was hostile.
 */
const UNSAFE_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Extension keys must be reverse-domain (`com.example.thing`) or vendor-prefixed
 * (`x-thing`) so that a future canonical field can never collide with one.
 */
const EXTENSION_KEY_PATTERN = /^(?:x-[a-z0-9][a-z0-9-]*|[a-z0-9-]+(?:\.[a-z0-9-]+)+)$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Narrowing membership test that keeps the single unavoidable cast in one place. */
function isOneOf<T extends string>(allowed: readonly T[], candidate: unknown): candidate is T {
  return typeof candidate === 'string' && (allowed as readonly string[]).includes(candidate);
}

function asArray(value: unknown): readonly unknown[] | null {
  return Array.isArray(value) ? (value as readonly unknown[]) : null;
}

interface TextRules {
  readonly min: number;
  readonly max: number;
}

/**
 * Validate one text field. Returns the normalized value, or `undefined` when the value
 * is unusable — in which case an issue has been recorded.
 *
 * An optional field that normalizes to empty is treated as absent rather than invalid:
 * a user clearing a subject box should not fail validation.
 */
function readText(
  raw: unknown,
  path: string,
  rules: TextRules,
  required: boolean,
  issues: CapsuleIssue[],
): string | undefined {
  if (raw === undefined || raw === null) {
    if (required) issues.push(error('missing_field', path, `${path} is required.`));
    return undefined;
  }
  if (typeof raw !== 'string') {
    issues.push(error('wrong_type', path, `${path} must be a string.`));
    return undefined;
  }

  const value = normalizeText(raw);
  if (!isSafeText(value)) {
    issues.push(error('unsafe_text', path, `${path} contains disallowed control characters.`));
    return undefined;
  }
  if (value.length < rules.min) {
    if (required) issues.push(error('empty_value', path, `${path} must not be empty.`));
    return undefined;
  }
  if (value.length > rules.max) {
    issues.push(error('too_long', path, `${path} exceeds the ${rules.max} character limit.`));
    return undefined;
  }
  return value;
}

interface ListRules {
  readonly maxItems: number;
  readonly maxItemLength: number;
  readonly minItems?: number;
}

/**
 * Validate a list of short strings. Absent lists become empty lists; empty entries are
 * dropped with a warning; an over-length list is an error rather than a silent
 * truncation, because truncating would discard the user's context without telling them.
 */
function readStringList(
  raw: unknown,
  path: string,
  rules: ListRules,
  issues: CapsuleIssue[],
): string[] {
  const minItems = rules.minItems ?? 0;

  const reportTooFew = (): void => {
    issues.push(error('too_few_items', path, `${path} requires at least ${minItems} item(s).`));
  };

  if (raw === undefined || raw === null) {
    if (minItems > 0) reportTooFew();
    return [];
  }

  const items = asArray(raw);
  if (items === null) {
    issues.push(error('wrong_type', path, `${path} must be an array of strings.`));
    return [];
  }
  if (items.length > rules.maxItems) {
    issues.push(error('too_many_items', path, `${path} exceeds the ${rules.maxItems} item limit.`));
    return [];
  }

  const values: string[] = [];
  items.forEach((entry, index) => {
    const itemPath = `${path}.${String(index)}`;
    if (typeof entry !== 'string') {
      issues.push(error('wrong_type', itemPath, `${itemPath} must be a string.`));
      return;
    }
    const value = normalizeText(entry);
    if (!isSafeText(value)) {
      issues.push(
        error('unsafe_text', itemPath, `${itemPath} contains disallowed control characters.`),
      );
      return;
    }
    if (value.length === 0) {
      issues.push(warning('empty_value', itemPath, `${itemPath} was empty and was removed.`));
      return;
    }
    if (value.length > rules.maxItemLength) {
      issues.push(
        error(
          'too_long',
          itemPath,
          `${itemPath} exceeds the ${rules.maxItemLength} character limit.`,
        ),
      );
      return;
    }
    values.push(value);
  });

  if (values.length < minItems) reportTooFew();
  return values;
}

function readFiles(raw: unknown, issues: CapsuleIssue[]): CapsuleFileReference[] {
  const path = 'files';
  if (raw === undefined || raw === null) return [];

  const entries = asArray(raw);
  if (entries === null) {
    issues.push(error('wrong_type', path, 'files must be an array.'));
    return [];
  }
  if (entries.length > CAPSULE_LIMITS.files.maxItems) {
    issues.push(
      error(
        'too_many_items',
        path,
        `files exceeds the ${CAPSULE_LIMITS.files.maxItems} item limit.`,
      ),
    );
    return [];
  }

  const files: CapsuleFileReference[] = [];
  entries.forEach((entry, index) => {
    const entryPath = `${path}.${String(index)}`;
    if (!isPlainObject(entry)) {
      issues.push(error('wrong_type', entryPath, `${entryPath} must be an object.`));
      return;
    }
    const filePath = readText(
      entry['path'],
      `${entryPath}.path`,
      { min: 1, max: CAPSULE_LIMITS.files.maxPathLength },
      true,
      issues,
    );
    if (filePath === undefined) return;

    const note = readText(
      entry['note'],
      `${entryPath}.note`,
      { min: 1, max: CAPSULE_LIMITS.files.maxNoteLength },
      false,
      issues,
    );
    files.push(note === undefined ? { path: filePath } : { path: filePath, note });
  });
  return files;
}

function readTags(raw: unknown, issues: CapsuleIssue[]): string[] {
  const tags = readStringList(
    raw,
    'tags',
    { maxItems: CAPSULE_LIMITS.tags.maxItems, maxItemLength: CAPSULE_LIMITS.tags.maxTagLength },
    issues,
  );
  const unique: string[] = [];
  for (const tag of tags) {
    if (unique.includes(tag)) {
      issues.push(warning('empty_value', 'tags', `Duplicate tag "${tag}" was removed.`));
      continue;
    }
    unique.push(tag);
  }
  return unique;
}

function readSource(raw: unknown, issues: CapsuleIssue[]): CapsuleSource | undefined {
  const path = 'source';
  if (raw === undefined || raw === null) {
    issues.push(error('missing_field', path, 'source is required.'));
    return undefined;
  }
  if (!isPlainObject(raw)) {
    issues.push(error('wrong_type', path, 'source must be an object.'));
    return undefined;
  }

  let provider: CaptureProvider | undefined;
  if (isOneOf(CAPTURE_PROVIDERS, raw['provider'])) {
    provider = raw['provider'];
  } else {
    issues.push(
      error(
        'invalid_enum',
        `${path}.provider`,
        `source.provider must be one of: ${CAPTURE_PROVIDERS.join(', ')}.`,
      ),
    );
  }

  let excerptStatus: ExcerptStatus | undefined;
  if (isOneOf(EXCERPT_STATUSES, raw['excerptStatus'])) {
    excerptStatus = raw['excerptStatus'];
  } else {
    issues.push(
      error(
        'invalid_enum',
        `${path}.excerptStatus`,
        `source.excerptStatus must be one of: ${EXCERPT_STATUSES.join(', ')}.`,
      ),
    );
  }

  let capturedAt: string | undefined;
  const capturedAtRaw = raw['capturedAt'];
  if (typeof capturedAtRaw !== 'string') {
    issues.push(error('missing_field', `${path}.capturedAt`, 'source.capturedAt is required.'));
  } else if (!isRfc3339Utc(capturedAtRaw)) {
    issues.push(
      error(
        'invalid_format',
        `${path}.capturedAt`,
        'source.capturedAt must be an RFC3339 UTC timestamp ending in Z.',
      ),
    );
  } else {
    capturedAt = capturedAtRaw;
  }

  let visibleTurnCount: number | undefined;
  const turnCountRaw = raw['visibleTurnCount'];
  if (typeof turnCountRaw !== 'number' || !Number.isInteger(turnCountRaw)) {
    issues.push(
      error(
        'wrong_type',
        `${path}.visibleTurnCount`,
        'source.visibleTurnCount must be an integer.',
      ),
    );
  } else if (
    turnCountRaw < CAPSULE_LIMITS.visibleTurnCount.min ||
    turnCountRaw > CAPSULE_LIMITS.visibleTurnCount.max
  ) {
    issues.push(
      error(
        'out_of_range',
        `${path}.visibleTurnCount`,
        `source.visibleTurnCount must be between ${CAPSULE_LIMITS.visibleTurnCount.min} and ${CAPSULE_LIMITS.visibleTurnCount.max}.`,
      ),
    );
  } else {
    visibleTurnCount = turnCountRaw;
  }

  let conversationUrl: string | undefined;
  let urlFailed = false;
  const urlRaw = raw['conversationUrl'];
  if (urlRaw !== undefined && urlRaw !== null && urlRaw !== '') {
    if (typeof urlRaw !== 'string') {
      issues.push(
        error('wrong_type', `${path}.conversationUrl`, 'source.conversationUrl must be a string.'),
      );
      urlFailed = true;
    } else if (urlRaw.length > CAPSULE_LIMITS.conversationUrl.maxLength) {
      issues.push(
        error('too_long', `${path}.conversationUrl`, 'source.conversationUrl is too long.'),
      );
      urlFailed = true;
    } else if (parseSafeHttpUrl(urlRaw) === null) {
      issues.push(
        error(
          'unsafe_url_scheme',
          `${path}.conversationUrl`,
          'source.conversationUrl must be an absolute http or https URL.',
        ),
      );
      urlFailed = true;
    } else {
      conversationUrl = urlRaw;
    }
  }

  if (
    provider === undefined ||
    excerptStatus === undefined ||
    capturedAt === undefined ||
    visibleTurnCount === undefined ||
    urlFailed
  ) {
    return undefined;
  }

  return conversationUrl === undefined
    ? { provider, capturedAt, visibleTurnCount, excerptStatus }
    : { provider, conversationUrl, capturedAt, visibleTurnCount, excerptStatus };
}

function readSourceExcerpt(raw: unknown, issues: CapsuleIssue[]): CapsuleSourceExcerpt {
  const path = 'sourceExcerpt';
  if (raw === undefined || raw === null) return null;

  const entries = asArray(raw);
  if (entries === null) {
    issues.push(error('wrong_type', path, 'sourceExcerpt must be an array of turns or null.'));
    return null;
  }
  if (entries.length > CAPSULE_LIMITS.excerpt.maxTurns) {
    issues.push(
      error(
        'too_many_items',
        path,
        `sourceExcerpt exceeds the ${CAPSULE_LIMITS.excerpt.maxTurns} turn limit.`,
      ),
    );
    return null;
  }

  const turns: CapsuleExcerptTurn[] = [];
  let totalLength = 0;

  entries.forEach((entry, index) => {
    const turnPath = `${path}.${String(index)}`;
    if (!isPlainObject(entry)) {
      issues.push(error('wrong_type', turnPath, `${turnPath} must be an object.`));
      return;
    }
    if (!isOneOf(EXCERPT_ROLES, entry['role'])) {
      issues.push(
        error(
          'invalid_enum',
          `${turnPath}.role`,
          `${turnPath}.role must be "user" or "assistant".`,
        ),
      );
      return;
    }
    const role: ExcerptRole = entry['role'];

    const textRaw = entry['text'];
    if (typeof textRaw !== 'string') {
      issues.push(error('wrong_type', `${turnPath}.text`, `${turnPath}.text must be a string.`));
      return;
    }
    const text = normalizeTextPreservingIndent(textRaw).trimEnd();
    if (!isSafeText(text)) {
      issues.push(
        error(
          'unsafe_text',
          `${turnPath}.text`,
          `${turnPath}.text contains disallowed control characters.`,
        ),
      );
      return;
    }
    if (text.length > CAPSULE_LIMITS.excerpt.maxTurnLength) {
      issues.push(
        error(
          'too_long',
          `${turnPath}.text`,
          `${turnPath}.text exceeds the ${CAPSULE_LIMITS.excerpt.maxTurnLength} character limit.`,
        ),
      );
      return;
    }
    totalLength += text.length;
    turns.push({ role, text });
  });

  if (totalLength > CAPSULE_LIMITS.excerpt.maxTotalLength) {
    issues.push(
      error(
        'too_long',
        path,
        `sourceExcerpt exceeds the ${CAPSULE_LIMITS.excerpt.maxTotalLength} total character limit. Select fewer turns.`,
      ),
    );
    return null;
  }
  return turns.length === 0 ? null : turns;
}

/**
 * Enforce that the declared excerpt status matches what is actually present.
 *
 * Both directions are errors. A capsule claiming `user_selected` with no excerpt would
 * tell the user their raw conversation travelled with the file when it did not, and a
 * capsule carrying an excerpt while claiming `not_included` would hide an actual data
 * disclosure. Neither may pass as valid (Document 10 §5, §12).
 */
function checkSourceConsistency(
  source: CapsuleSource | undefined,
  excerpt: CapsuleSourceExcerpt,
  issues: CapsuleIssue[],
): void {
  if (source === undefined) return;
  const declaresExcerpt = source.excerptStatus !== 'not_included';
  const hasExcerpt = excerpt !== null && excerpt.length > 0;

  if (hasExcerpt && !declaresExcerpt) {
    issues.push(
      error(
        'inconsistent_source',
        'source.excerptStatus',
        'sourceExcerpt is present but source.excerptStatus says it is not included.',
      ),
    );
  }
  if (!hasExcerpt && declaresExcerpt) {
    issues.push(
      error(
        'inconsistent_source',
        'source.excerptStatus',
        `source.excerptStatus is "${source.excerptStatus}" but no sourceExcerpt is present.`,
      ),
    );
  }
}

/**
 * Depth check for extension values.
 *
 * Iterative on purpose: a recursive depth check would itself overflow on exactly the
 * input it is meant to reject.
 */
function exceedsMaxDepth(value: unknown, maxDepth: number): boolean {
  const stack: { node: unknown; depth: number }[] = [{ node: value, depth: 1 }];

  while (stack.length > 0) {
    const entry = stack.pop();
    if (entry === undefined) break;
    if (entry.node === null || typeof entry.node !== 'object') continue;
    if (entry.depth > maxDepth) return true;

    const children: readonly unknown[] = Array.isArray(entry.node)
      ? (entry.node as readonly unknown[])
      : Object.values(entry.node);
    for (const child of children) {
      stack.push({ node: child, depth: entry.depth + 1 });
    }
  }
  return false;
}

function readExtensions(raw: unknown, issues: CapsuleIssue[]): Record<string, unknown> {
  const path = 'extensions';
  if (raw === undefined || raw === null) return {};
  if (!isPlainObject(raw)) {
    issues.push(error('wrong_type', path, 'extensions must be an object.'));
    return {};
  }

  const keys = Object.keys(raw);
  if (keys.length > CAPSULE_LIMITS.extensions.maxKeys) {
    issues.push(
      error(
        'too_many_items',
        path,
        `extensions exceeds the ${CAPSULE_LIMITS.extensions.maxKeys} key limit.`,
      ),
    );
    return {};
  }

  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const keyPath = `${path}.${key}`;
    if (UNSAFE_KEYS.has(key)) {
      issues.push(error('unsafe_key', keyPath, `extensions key "${key}" is not permitted.`));
      continue;
    }
    if (key.length > CAPSULE_LIMITS.extensions.maxKeyLength) {
      issues.push(error('too_long', keyPath, `extensions key "${key}" is too long.`));
      continue;
    }
    if (CANONICAL_FIELD_NAMES.has(key)) {
      issues.push(
        error(
          'invalid_extension_namespace',
          keyPath,
          `extensions key "${key}" shadows a canonical field.`,
        ),
      );
      continue;
    }
    if (!EXTENSION_KEY_PATTERN.test(key)) {
      issues.push(
        error(
          'invalid_extension_namespace',
          keyPath,
          `extensions key "${key}" must be reverse-domain (com.example.thing) or vendor-prefixed (x-thing).`,
        ),
      );
      continue;
    }
    if (exceedsMaxDepth(raw[key], CAPSULE_LIMITS.extensions.maxDepth)) {
      issues.push(
        error(
          'too_long',
          keyPath,
          `extensions key "${key}" nests deeper than the ${CAPSULE_LIMITS.extensions.maxDepth} level limit.`,
        ),
      );
      continue;
    }
    result[key] = raw[key];
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(result);
  } catch {
    issues.push(error('wrong_type', path, 'extensions must contain JSON-serializable values.'));
    return {};
  }
  if (byteLength(serialized) > CAPSULE_LIMITS.extensions.maxBytes) {
    issues.push(
      error(
        'payload_too_large',
        path,
        `extensions exceeds the ${CAPSULE_LIMITS.extensions.maxBytes} byte limit.`,
      ),
    );
    return {};
  }
  return result;
}

/**
 * Validate and normalize an untrusted value into a {@link Capsule}.
 *
 * Never throws and never mutates `input`.
 */
export function validateCapsule(
  input: unknown,
  options: ValidateOptions = {},
): CapsuleValidationOutcome<Capsule> {
  const mode: ValidationMode = options.mode ?? 'strict';
  const issues: CapsuleIssue[] = [];
  const draft: CapsuleDraft = {};

  if (!isPlainObject(input)) {
    issues.push(error('not_an_object', '', 'A capsule must be a JSON object.'));
    return { ok: false, issues, draft };
  }

  // --- Schema version -----------------------------------------------------------
  const versionRaw = input['schemaVersion'];
  if (typeof versionRaw !== 'string') {
    issues.push(error('unsupported_schema_version', 'schemaVersion', 'schemaVersion is required.'));
    return { ok: false, issues, draft };
  }
  const compatibility = assessSchemaVersion(versionRaw);
  if (compatibility === 'unsupported') {
    // Stop here: field meanings cannot be trusted across an unsupported major, so
    // reporting downstream field errors would be misleading (Document 10 §8).
    issues.push(
      error(
        'unsupported_schema_version',
        'schemaVersion',
        `Schema version "${versionRaw}" cannot be imported by this version of Context Capsule.`,
      ),
    );
    return { ok: false, issues, draft };
  }
  if (compatibility === 'newer_minor') {
    issues.push(
      warning(
        'unsupported_schema_version',
        'schemaVersion',
        `This capsule was written by a newer version (${versionRaw}); some content may not be shown.`,
      ),
    );
  }
  draft.schemaVersion = SCHEMA_VERSION;

  // --- Root key hygiene ---------------------------------------------------------
  const unknownFields: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (UNSAFE_KEYS.has(key)) {
      issues.push(error('unsafe_key', key, `Key "${key}" is not permitted in a capsule.`));
      continue;
    }
    if (CANONICAL_FIELD_NAMES.has(key)) continue;

    if (mode === 'strict') {
      issues.push(error('unknown_field', key, `Unknown field "${key}".`));
    } else {
      unknownFields[key] = input[key];
      issues.push(
        warning('unknown_field', key, `Unknown field "${key}" was preserved under extensions.`),
      );
    }
  }

  // --- Identity and timestamps --------------------------------------------------
  let id: string | undefined;
  const idRaw = input['id'];
  if (typeof idRaw !== 'string') {
    issues.push(error('missing_field', 'id', 'id is required.'));
  } else if (!isUuid(idRaw)) {
    issues.push(error('invalid_format', 'id', 'id must be a lowercase UUID.'));
  } else {
    id = idRaw;
    draft.id = idRaw;
  }

  let createdAt: string | undefined;
  const createdAtRaw = input['createdAt'];
  if (typeof createdAtRaw !== 'string' || !isRfc3339Utc(createdAtRaw)) {
    issues.push(
      error(
        'invalid_format',
        'createdAt',
        'createdAt must be an RFC3339 UTC timestamp ending in Z.',
      ),
    );
  } else {
    createdAt = createdAtRaw;
    draft.createdAt = createdAtRaw;
  }

  let updatedAt: string | undefined;
  const updatedAtRaw = input['updatedAt'];
  if (typeof updatedAtRaw !== 'string' || !isRfc3339Utc(updatedAtRaw)) {
    issues.push(
      error(
        'invalid_format',
        'updatedAt',
        'updatedAt must be an RFC3339 UTC timestamp ending in Z.',
      ),
    );
  } else {
    updatedAt = updatedAtRaw;
    draft.updatedAt = updatedAtRaw;
  }

  if (
    createdAt !== undefined &&
    updatedAt !== undefined &&
    Date.parse(updatedAt) < Date.parse(createdAt)
  ) {
    issues.push(
      error('timestamp_order', 'updatedAt', 'updatedAt must not be earlier than createdAt.'),
    );
  }

  // --- Text fields --------------------------------------------------------------
  const title = readText(input['title'], 'title', CAPSULE_LIMITS.title, true, issues);
  if (title !== undefined) draft.title = title;

  const subject = readText(input['subject'], 'subject', CAPSULE_LIMITS.subject, false, issues);
  if (subject !== undefined) draft.subject = subject;

  const goal = readText(input['goal'], 'goal', CAPSULE_LIMITS.goal, true, issues);
  if (goal !== undefined) draft.goal = goal;

  const currentState = readText(
    input['currentState'],
    'currentState',
    CAPSULE_LIMITS.currentState,
    true,
    issues,
  );
  if (currentState !== undefined) draft.currentState = currentState;

  // --- List fields --------------------------------------------------------------
  const lists: Partial<Record<StringListField, string[]>> = {};
  for (const field of STRING_LIST_FIELDS) {
    lists[field] = readStringList(
      input[field],
      field,
      field === 'pendingTasks'
        ? { ...CAPSULE_LIMITS.stringList, minItems: MIN_PENDING_TASKS }
        : CAPSULE_LIMITS.stringList,
      issues,
    );
  }
  const decisions = lists.decisions ?? [];
  const constraints = lists.constraints ?? [];
  const completed = lists.completed ?? [];
  const pendingTasks = lists.pendingTasks ?? [];
  const openQuestions = lists.openQuestions ?? [];
  draft.decisions = decisions;
  draft.constraints = constraints;
  draft.completed = completed;
  draft.pendingTasks = pendingTasks;
  draft.openQuestions = openQuestions;

  const files = readFiles(input['files'], issues);
  draft.files = files;

  const tags = readTags(input['tags'], issues);
  draft.tags = tags;

  // --- Source -------------------------------------------------------------------
  const source = readSource(input['source'], issues);
  if (source !== undefined) draft.source = source;

  const sourceExcerpt = readSourceExcerpt(input['sourceExcerpt'], issues);
  draft.sourceExcerpt = sourceExcerpt;
  checkSourceConsistency(source, sourceExcerpt, issues);

  // --- Extensions ---------------------------------------------------------------
  const extensions = readExtensions(input['extensions'], issues);
  if (Object.keys(unknownFields).length > 0) {
    extensions[UNKNOWN_FIELDS_EXTENSION_KEY] = unknownFields;
  }
  draft.extensions = extensions;

  if (hasErrors(issues)) {
    return { ok: false, issues, draft };
  }

  if (
    id === undefined ||
    title === undefined ||
    goal === undefined ||
    currentState === undefined ||
    createdAt === undefined ||
    updatedAt === undefined ||
    source === undefined
  ) {
    // Unreachable while every branch above records an error for its own failure. Kept
    // as a guard so that a future edit which forgets to push an issue fails closed
    // rather than emitting a capsule with a missing required field.
    return {
      ok: false,
      issues: [
        ...issues,
        error('missing_field', '', 'A required field was missing after validation.'),
      ],
      draft,
    };
  }

  const capsule: Capsule = {
    schemaVersion: SCHEMA_VERSION,
    id,
    title,
    ...(subject === undefined ? {} : { subject }),
    goal,
    currentState,
    decisions,
    constraints,
    completed,
    files,
    pendingTasks,
    openQuestions,
    source,
    sourceExcerpt,
    tags,
    createdAt,
    updatedAt,
    extensions,
  };

  return { ok: true, capsule, warnings: issues };
}

/** Type guard form for call sites that only need a yes/no answer. */
export function isValidCapsule(input: unknown): input is Capsule {
  return validateCapsule(input).ok;
}
