/**
 * Capsule lifecycle policy: duplicate, rename, and the soft-delete undo window
 * (Document 02 F-04, Document 08 §5).
 *
 * These are pure functions over a validated capsule. They produce a *candidate* and route
 * it back through {@link validateCapsule}, so an operation that would produce an invalid
 * capsule — a rename to an empty string, a duplicate whose title no longer fits — fails
 * here rather than being written to storage and failing on the next read.
 */

import {
  CAPSULE_LIMITS,
  toRfc3339Utc,
  validateCapsule,
  type Capsule,
  type CapsuleEnvironment,
  type CapsuleValidationOutcome,
  systemCapsuleEnvironment,
} from '@context-capsule/capsule-schema';

import { type CapsuleRecord } from './repository.js';

/**
 * How long a deleted capsule stays recoverable.
 *
 * Document 02 F-04 requires "at least ten seconds". Ten is the floor rather than a
 * generous choice: the window is a safety net for a misclick, and a longer one means a
 * user who deliberately deleted something sensitive watches it linger in storage.
 */
export const UNDO_WINDOW_MS = 10_000;

const COPY_PREFIX = 'Copy of ';

/** True while a soft-deleted record can still be restored. */
export function isUndoAvailable(record: CapsuleRecord, now: Date): boolean {
  if (record.deletedAt === null) return false;
  return now.getTime() - Date.parse(record.deletedAt) < UNDO_WINDOW_MS;
}

/** Milliseconds left on the undo window, clamped at zero. Drives the countdown in UI. */
export function undoTimeRemainingMs(record: CapsuleRecord, now: Date): number {
  if (record.deletedAt === null) return 0;
  const elapsed = now.getTime() - Date.parse(record.deletedAt);
  return Math.max(0, UNDO_WINDOW_MS - elapsed);
}

/**
 * Prefix a title with "Copy of", trimming the original if the result would exceed the
 * title limit. Trimming is visible (it ends in an ellipsis) rather than a silent cut.
 */
export function copyTitle(title: string): string {
  const candidate = `${COPY_PREFIX}${title}`;
  if (candidate.length <= CAPSULE_LIMITS.title.max) return candidate;

  const room = CAPSULE_LIMITS.title.max - COPY_PREFIX.length - 1;
  return `${COPY_PREFIX}${title.slice(0, room)}…`;
}

/**
 * Copy a capsule under a new identity.
 *
 * The copy gets its own id and its own creation time: it is a new capsule that happens to
 * start with the same content, not a second pointer to the original. `source` is carried
 * over unchanged, because the content really did come from that conversation and
 * rewriting it to `manual` would make the copy lie about its own provenance.
 */
export function duplicateCapsule(
  capsule: Capsule,
  environment: CapsuleEnvironment = systemCapsuleEnvironment,
): CapsuleValidationOutcome<Capsule> {
  const timestamp = toRfc3339Utc(environment.now());
  return validateCapsule({
    ...capsule,
    id: environment.newId(),
    title: copyTitle(capsule.title),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * Rename a capsule.
 *
 * `updatedAt` is clamped so it can never precede `createdAt`, matching `touchCapsule` —
 * a skewed system clock must not produce a capsule that fails its own validation on
 * re-import.
 */
export function renameCapsule(
  capsule: Capsule,
  title: string,
  environment: CapsuleEnvironment = systemCapsuleEnvironment,
): CapsuleValidationOutcome<Capsule> {
  const now = environment.now().getTime();
  const updatedAt = toRfc3339Utc(new Date(Math.max(now, Date.parse(capsule.createdAt))));
  return validateCapsule({ ...capsule, title, updatedAt });
}
