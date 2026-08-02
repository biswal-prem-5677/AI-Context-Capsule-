/**
 * Canonical Context Capsule envelope (Document 10 §2–§3).
 *
 * This is the single definition of capsule shape for the whole product. No app may
 * redefine it (Document 14 §2).
 */

/** Current canonical schema version emitted by this package. */
export const SCHEMA_VERSION = '1.0';

/** Media type of the canonical JSON representation (Document 10 §2). */
export const CAPSULE_MEDIA_TYPE = 'application/vnd.context-capsule+json';

/** Conventional file extension of an exported capsule (Document 10 §2). */
export const CAPSULE_FILE_EXTENSION = '.context-capsule.json';

/**
 * Where the capsule content came from. This records capture source only. It is not a
 * claim about destination support and not a provider affiliation (Document 10 §3).
 */
export const CAPTURE_PROVIDERS = [
  'chatgpt',
  'claude',
  'gemini',
  'manual',
  'imported',
  'other',
] as const;
export type CaptureProvider = (typeof CAPTURE_PROVIDERS)[number];

/** Disclosure state of the optional raw excerpt (Document 10 §5). */
export const EXCERPT_STATUSES = [
  'not_included',
  'user_selected',
  'truncated',
  'manual_summary',
] as const;
export type ExcerptStatus = (typeof EXCERPT_STATUSES)[number];

export const EXCERPT_ROLES = ['user', 'assistant'] as const;
export type ExcerptRole = (typeof EXCERPT_ROLES)[number];

/**
 * A reference to a file the user is working on. Display text only — the product never
 * reads, embeds, or resolves local file contents (Document 10 §3).
 */
export interface CapsuleFileReference {
  readonly path: string;
  readonly note?: string;
}

export interface CapsuleSource {
  readonly provider: CaptureProvider;
  readonly conversationUrl?: string;
  readonly capturedAt: string;
  readonly visibleTurnCount: number;
  readonly excerptStatus: ExcerptStatus;
}

export interface CapsuleExcerptTurn {
  readonly role: ExcerptRole;
  readonly text: string;
}

/**
 * Optional user-selected raw conversation excerpt. May contain personal or sensitive
 * data, so it is collapsed in UI, excluded from default sync, and marked in exports.
 */
export type CapsuleSourceExcerpt = readonly CapsuleExcerptTurn[] | null;

/**
 * A validated capsule. A value of this type has passed {@link validateCapsule}: every
 * field is normalized and within bounds. Construct it only through this package.
 */
export interface Capsule {
  readonly schemaVersion: string;
  readonly id: string;
  readonly title: string;
  readonly subject?: string;
  readonly goal: string;
  readonly currentState: string;
  readonly decisions: readonly string[];
  readonly constraints: readonly string[];
  readonly completed: readonly string[];
  readonly files: readonly CapsuleFileReference[];
  readonly pendingTasks: readonly string[];
  readonly openQuestions: readonly string[];
  readonly source: CapsuleSource;
  readonly sourceExcerpt: CapsuleSourceExcerpt;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly extensions: Readonly<Record<string, unknown>>;
}

/**
 * A partially valid capsule recovered from failed validation.
 *
 * Document 10 §4.6 requires the importer to be able to keep an incomplete review draft
 * without ever marking it valid. A draft is what the user edits; it is never persisted
 * as a capsule and never projected into a prompt.
 */
export type CapsuleDraft = {
  -readonly [K in keyof Capsule]?: Capsule[K];
};

/**
 * Canonical field order. Used by the JSON serializer so exports are byte-stable, which
 * makes payload hashing (Document 10 §9) and file diffs meaningful.
 */
export const CANONICAL_FIELD_ORDER = [
  'schemaVersion',
  'id',
  'title',
  'subject',
  'goal',
  'currentState',
  'decisions',
  'constraints',
  'completed',
  'files',
  'pendingTasks',
  'openQuestions',
  'source',
  'sourceExcerpt',
  'tags',
  'createdAt',
  'updatedAt',
  'extensions',
] as const satisfies readonly (keyof Capsule)[];

export const CANONICAL_FIELD_NAMES: ReadonlySet<string> = new Set(CANONICAL_FIELD_ORDER);

/** String list fields that share identical validation rules. */
export const STRING_LIST_FIELDS = [
  'decisions',
  'constraints',
  'completed',
  'pendingTasks',
  'openQuestions',
] as const;
export type StringListField = (typeof STRING_LIST_FIELDS)[number];
