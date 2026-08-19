/**
 * The only place a storage failure becomes something a person reads.
 *
 * Document 14 §4: "Commands return typed `Result`/error codes that UI maps to accessible
 * copy. Do not surface raw provider/HTTP error text." `RepositoryError.message` is
 * engineer-facing detail for logs and tests — it can contain a `DOMException` string, a
 * database name, or an internal path, none of which belong in front of a user. Nothing
 * here reads that field.
 *
 * Copy follows Document 04 §5.4: short, factual, no hype. "Browser storage is full"
 * rather than "Oops! Something went wrong." Every failure carries a recovery action,
 * because Document 04 §1 and `EXECUTION_RULES.md` §5.4 both require a failure to leave
 * the user somewhere they can act.
 */

import { type RepositoryError, type RepositoryErrorCode } from '@context-capsule/capsule-core';

/**
 * What the user can usefully do next. The UI turns this into a real control; it is a code
 * rather than a label so a surface can render it as a button, a link, or nothing at all
 * depending on where it is.
 */
export const RECOVERY_ACTIONS = [
  /** The operation may succeed on a second attempt. */
  'retry',
  /** Free space or repair a record from the local-data page. */
  'manage_local_data',
  /** Nothing to do — the state is already correct from the user's point of view. */
  'none',
] as const;

export type RecoveryAction = (typeof RECOVERY_ACTIONS)[number];

export interface UserFacingError {
  /** One short sentence naming what failed. */
  readonly title: string;
  /** One sentence on what it means for the user's data. Never blank. */
  readonly detail: string;
  readonly recovery: RecoveryAction;
}

const REPOSITORY_ERROR_COPY: Readonly<Record<RepositoryErrorCode, UserFacingError>> = {
  not_found: {
    title: 'That capsule is no longer here.',
    detail: 'It was deleted, or its undo period has passed.',
    recovery: 'none',
  },
  quota_exceeded: {
    title: 'Browser storage is full.',
    detail:
      'Nothing was saved and your existing capsules are untouched. Export and remove a capsule to make room, then try again.',
    recovery: 'manage_local_data',
  },
  unavailable: {
    title: 'Local storage is unavailable.',
    detail:
      'Chrome would not open the capsule database. This can happen in a private window or while another tab is upgrading it.',
    recovery: 'retry',
  },
  corrupt_record: {
    title: 'That capsule could not be read.',
    detail:
      'It is still on this device and has not been changed. You can export it as-is or remove it from the local-data page.',
    recovery: 'manage_local_data',
  },
  conflict: {
    title: 'This capsule changed somewhere else.',
    detail: 'Another window saved it while you were working. Reopen it to see the current version.',
    recovery: 'retry',
  },
};

export function describeRepositoryError(error: RepositoryError): UserFacingError {
  return REPOSITORY_ERROR_COPY[error.code];
}
