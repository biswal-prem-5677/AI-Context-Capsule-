/**
 * Reading a stored value back into a trusted {@link CapsuleRecord}.
 *
 * This is a validation boundary, not a cast (Document 14 §4). Everything in the object
 * store was written by this extension, but "we wrote it" is not the same as "it is still
 * valid": browser storage can be corrupted, a capsule can have been written by a newer
 * build that stores a field this one does not know, and a user can edit an IndexedDB
 * record by hand. A record that does not survive validation is reported as
 * `corrupt_record` and left untouched on disk — Document 08 §7 requires unreadable records
 * to be preserved with a recovery message, never quietly repaired or dropped.
 */

import { type CapsuleRecord } from '@context-capsule/capsule-core';
import { isRfc3339Utc, validateCapsule } from '@context-capsule/capsule-schema';

export type StoredRecordOutcome =
  | { readonly ok: true; readonly record: CapsuleRecord }
  /** Engineer-facing, never capsule content — it reaches logs (Document 07 §7). */
  | { readonly ok: false; readonly reason: string };

function field(entry: unknown, name: string): unknown {
  if (typeof entry !== 'object' || entry === null) return undefined;
  if (!(name in entry)) return undefined;
  const values: Readonly<Record<string, unknown>> = { ...entry };
  return values[name];
}

/**
 * The stored revision, or 0 when it cannot be read.
 *
 * Separate from {@link readStoredRecord} so that a write can compute the next revision
 * even when the capsule beside it is unreadable: overwriting a corrupt record with a valid
 * capsule under the same id is a repair, and it must not restart the revision count.
 */
export function readStoredRevision(entry: unknown): number {
  const revision = field(entry, 'revision');
  if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 1) return 0;
  return revision;
}

/**
 * The stored deletion timestamp, or `null` when the record is live *or* the timestamp is
 * unreadable.
 *
 * Treating an unreadable timestamp as "not deleted" is the deliberate direction: it means
 * `purgeExpired` never destroys a record whose undo window it cannot actually evaluate.
 */
export function readStoredDeletedAt(entry: unknown): string | null {
  const deletedAt = field(entry, 'deletedAt');
  if (typeof deletedAt !== 'string' || !isRfc3339Utc(deletedAt)) return null;
  return deletedAt;
}

export function readStoredRecord(entry: unknown): StoredRecordOutcome {
  if (typeof entry !== 'object' || entry === null) {
    return { ok: false, reason: 'the stored value is not an object' };
  }

  const revision = readStoredRevision(entry);
  if (revision === 0) {
    return { ok: false, reason: 'the stored revision is not a positive integer' };
  }

  const rawDeletedAt = field(entry, 'deletedAt');
  if (rawDeletedAt !== null && readStoredDeletedAt(entry) === null) {
    return { ok: false, reason: 'the stored deletion timestamp is not an RFC 3339 UTC instant' };
  }

  // `compatibility` rather than `strict`: a capsule written by a newer minor version of
  // the extension keeps its unrecognised root fields under the schema's extension key
  // instead of being declared corrupt (Document 10 §4.7). A user who installs an update,
  // saves, and then rolls back must not lose the capsule.
  const outcome = validateCapsule(field(entry, 'capsule'), { mode: 'compatibility' });
  if (!outcome.ok) {
    const first = outcome.issues[0];
    const detail = first === undefined ? 'no issue reported' : `${first.code} at "${first.path}"`;
    return {
      ok: false,
      reason: `the stored capsule failed validation (${String(outcome.issues.length)} issue(s), first: ${detail})`,
    };
  }

  return {
    ok: true,
    record: { capsule: outcome.capsule, revision, deletedAt: readStoredDeletedAt(entry) },
  };
}
