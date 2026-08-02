/**
 * Schema version compatibility policy (Document 10 §8).
 *
 * Rules encoded here:
 *  - Additions that preserve meaning are compatible inside a major version.
 *  - Removing, renaming, or changing the meaning of a required field needs a new major.
 *  - The importer accepts major N and N-1 for a documented period.
 *  - An unknown future major is never imported as a valid capsule; the user is offered
 *    the raw file and a clear version error instead.
 */

import { SCHEMA_VERSION } from './types.js';

export interface SchemaVersionParts {
  readonly major: number;
  readonly minor: number;
}

const VERSION_PATTERN = /^(\d{1,3})\.(\d{1,3})$/;

export function parseSchemaVersion(value: string): SchemaVersionParts | null {
  const match = VERSION_PATTERN.exec(value);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (!Number.isInteger(major) || !Number.isInteger(minor)) return null;
  return { major, minor };
}

export const CURRENT_SCHEMA_VERSION: SchemaVersionParts = (() => {
  const parts = parseSchemaVersion(SCHEMA_VERSION);
  /* c8 ignore next */
  if (!parts) throw new Error(`SCHEMA_VERSION "${SCHEMA_VERSION}" is not a valid version.`);
  return parts;
})();

/** Oldest major version the importer still accepts (current major minus one). */
export const MIN_SUPPORTED_MAJOR = Math.max(1, CURRENT_SCHEMA_VERSION.major - 1);

export type SchemaVersionCompatibility =
  /** Exactly the version this build emits. */
  | 'current'
  /** Same major, older minor. Readable; migration fills in defaults. */
  | 'older_minor'
  /**
   * Same major, newer minor. Readable by contract, but may carry fields this build does
   * not understand, so the user is warned that some content may not be shown.
   */
  | 'newer_minor'
  /** Previous major. Readable during the documented support window. */
  | 'previous_major'
  /** Future or retired major, or an unparseable value. Not importable. */
  | 'unsupported';

export function assessSchemaVersion(value: string): SchemaVersionCompatibility {
  const parts = parseSchemaVersion(value);
  if (!parts) return 'unsupported';

  const { major, minor } = parts;
  if (major > CURRENT_SCHEMA_VERSION.major) return 'unsupported';
  if (major < MIN_SUPPORTED_MAJOR) return 'unsupported';
  if (major < CURRENT_SCHEMA_VERSION.major) return 'previous_major';

  if (minor === CURRENT_SCHEMA_VERSION.minor) return 'current';
  return minor < CURRENT_SCHEMA_VERSION.minor ? 'older_minor' : 'newer_minor';
}

export function isImportable(compatibility: SchemaVersionCompatibility): boolean {
  return compatibility !== 'unsupported';
}

/**
 * Upgrade a parsed capsule object to the current schema version.
 *
 * Schema 1.0 is the first published version, so there is nothing to transform yet and
 * this is deliberately not a migration registry — an empty registry would be an
 * abstraction with no caller. When 1.1 or 2.0 ships, add the step here, keep the
 * transformation pure, and cover it with a fixture from the older version. Document 10
 * §8 requires migration to be transactional at the storage layer and to leave the user
 * an export of the original before any destructive transformation; that is the caller's
 * responsibility, not this function's.
 */
export function migrateToCurrentVersion(
  value: Readonly<Record<string, unknown>>,
  from: SchemaVersionParts,
): Readonly<Record<string, unknown>> {
  if (from.major === CURRENT_SCHEMA_VERSION.major) {
    return { ...value, schemaVersion: SCHEMA_VERSION };
  }
  /* c8 ignore next 3 */
  throw new Error(
    `No migration path from schema ${from.major}.${from.minor} to ${SCHEMA_VERSION}.`,
  );
}
