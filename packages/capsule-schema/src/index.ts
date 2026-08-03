/**
 * `@context-capsule/capsule-schema` — the canonical Context Capsule contract
 * (Document 10).
 *
 * Every app imports capsule types and validation from here. No app defines its own
 * capsule shape (Document 14 §2). The package has no runtime dependencies and no
 * platform APIs, so the same code runs in the extension service worker, an extension
 * page, the optional dashboard, and Node tests.
 */

export {
  CANONICAL_FIELD_ORDER,
  CANONICAL_FIELD_NAMES,
  CAPSULE_FILE_EXTENSION,
  CAPSULE_MEDIA_TYPE,
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

export { CAPSULE_LIMITS, MIN_PENDING_TASKS } from './limits.js';

export {
  CAPSULE_ISSUE_CODES,
  hasErrors,
  type CapsuleIssue,
  type CapsuleIssueCode,
  type CapsuleIssueSeverity,
  type CapsuleValidationOutcome,
} from './issues.js';

export {
  byteLength,
  isRfc3339Utc,
  isSafeText,
  isUuid,
  normalizeText,
  parseSafeHttpUrl,
  redactConversationUrl,
  toRfc3339Utc,
  type ParsedHttpUrl,
} from './text.js';

export {
  CURRENT_SCHEMA_VERSION,
  MIN_SUPPORTED_MAJOR,
  assessSchemaVersion,
  isImportable,
  migrateToCurrentVersion,
  parseSchemaVersion,
  type SchemaVersionCompatibility,
  type SchemaVersionParts,
} from './version.js';

export {
  UNKNOWN_FIELDS_EXTENSION_KEY,
  isValidCapsule,
  validateCapsule,
  type ValidateOptions,
  type ValidationMode,
} from './validate.js';

export {
  findDuplicateTopLevelKeys,
  parseCapsuleJson,
  serializeCapsuleJson,
  type ParseCapsuleJsonOptions,
} from './json-codec.js';

export {
  MARKDOWN_SECTIONS_EXTENSION_KEY,
  parseCapsuleMarkdown,
  serializeCapsuleMarkdown,
  type ParseCapsuleMarkdownOptions,
} from './markdown-codec.js';

export {
  createCapsule,
  redactCapsuleForExport,
  systemCapsuleEnvironment,
  touchCapsule,
  type CapsuleEnvironment,
  type NewCapsuleInput,
  type NewCapsuleSourceInput,
} from './operations.js';
