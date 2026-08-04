/**
 * The local capsule database (Document 07 §6, Document 08 §3).
 *
 * This module owns everything about *the store itself* — its name, its version, the
 * upgrade path, how a connection is opened, and how a browser storage failure is
 * translated into one of the repository's typed error codes. The repository in
 * `indexeddb-repository.ts` owns what capsules mean; this file owns IndexedDB.
 *
 * The split matters because IndexedDB failures are unusually varied — a private window, a
 * blocked upgrade from another tab, an evicted profile, a full disk — and every one of
 * them has to reach the user as an accessible sentence rather than as a raw
 * `DOMException`.
 */

import { type RepositoryErrorCode } from '@context-capsule/capsule-core';

/**
 * Database name. Not versioned in the name: IndexedDB has its own version number, and a
 * name like `context-capsule-v2` would leave the old database on disk holding the user's
 * capsules where nothing can reach them.
 */
export const CAPSULE_DATABASE_NAME = 'context-capsule';

/** Schema version. Bumping this requires an upgrade branch in {@link upgradeCapsuleDatabase}. */
export const CAPSULE_DATABASE_VERSION = 1;

export const CAPSULE_STORE_NAME = 'capsules';

/**
 * Records are keyed by the capsule's own id, read out of the nested envelope rather than
 * copied into a sibling column. A duplicated key is a second source of truth that can
 * drift from the capsule it describes.
 */
export const CAPSULE_KEY_PATH = 'capsule.id';

/**
 * Raised when the store cannot be reached at all, as opposed to a request that failed.
 *
 * A distinct type rather than a string match: the message is user-facing copy and will be
 * translated, and error classification must not depend on the wording.
 */
export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

/**
 * Create the object stores this version needs.
 *
 * Version 1 creates only `capsules`. Document 08 §3 also lists `operations`, `drafts`,
 * `settings`, and `diagnostics`; none is created yet, and that is deliberate rather than
 * unfinished. `operations` is the optional 1B sync queue, which is not open and may not be
 * built as groundwork. `drafts` and `settings` arrive with the editor and options UI in
 * Milestone 1b, and `diagnostics` only exists once a user has consented to it. An empty
 * store that nothing writes is schema surface to migrate later for no present benefit.
 *
 * No secondary indexes for the same reason. Document 08 §3 lists `updatedAt`,
 * `titleNormalized`, and `source.provider`, but Document 08 §2 only permits indexed
 * metadata "where it improves a defined query", and there is no such query: search and
 * sort are pure functions over summaries in `capsule-core/src/library.ts`, sized against
 * the 500-capsule target in Document 12 §7. Every index costs write time on every save and
 * has to be migrated; these would buy nothing today.
 */
export function upgradeCapsuleDatabase(database: IDBDatabase, fromVersion: number): void {
  if (fromVersion < 1) {
    database.createObjectStore(CAPSULE_STORE_NAME, { keyPath: CAPSULE_KEY_PATH });
  }
}

/**
 * Open the capsule database, running the upgrade path if needed.
 *
 * Rejects rather than returning a result: the repository is the layer that turns a failure
 * into a {@link RepositoryErrorCode}, and every caller there already has a catch.
 */
export function openCapsuleDatabase(
  factory: IDBFactory,
  databaseName: string = CAPSULE_DATABASE_NAME,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, CAPSULE_DATABASE_VERSION);

    request.onupgradeneeded = (event) => {
      upgradeCapsuleDatabase(request.result, event.oldVersion);
    };

    // Another context still holds an older version open, so the upgrade cannot proceed.
    // Reported as a retryable condition with an instruction the user can act on, rather
    // than left to hang until the other context happens to close.
    request.onblocked = () => {
      reject(
        new StorageUnavailableError(
          'Another Context Capsule window is still using an older version of the local capsule database. Close the other Context Capsule tabs and try again.',
        ),
      );
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ??
          new StorageUnavailableError(
            'The local capsule database could not be opened. Private browsing windows and blocked site data both prevent it.',
          ),
      );
    };
  });
}

/**
 * Resolve with a request's result, or reject with the reason it failed.
 *
 * The caller supplies the result type because `lib.dom` types several store methods as
 * `IDBRequest<any>`; naming `unknown` at the call site keeps the `any` from spreading into
 * the repository, where every stored value is validated before it is trusted anyway.
 */
export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('An IndexedDB request failed without a reason.'));
    };
  });
}

/**
 * Resolve when a transaction commits, reject when it fails or aborts.
 *
 * Awaiting this rather than the last request is what makes a write durable-or-reported:
 * quota exhaustion in particular surfaces at commit time, so code that returned as soon as
 * `put()` succeeded would tell the user their capsule was saved when it was not.
 */
export function transactionSettled(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('The local capsule transaction failed.'));
    };
    transaction.onabort = () => {
      reject(
        transaction.error ?? new StorageUnavailableError('The local capsule transaction aborted.'),
      );
    };
  });
}

/** Duck-typed rather than `instanceof Error`: `DOMException` does not extend `Error` in Chrome. */
function errorName(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const { name } = error;
    if (typeof name === 'string') return name;
  }
  return '';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error;
    if (typeof message === 'string') return message;
  }
  return 'no further detail available';
}

/**
 * `DOMException` names that mean something more specific than "storage is unavailable".
 *
 * `QuotaExceededError` is the one that matters to users: it means the write did not
 * happen and their existing capsules are intact, which is a different conversation from
 * "the database is gone".
 */
const STORAGE_ERROR_CODES: Readonly<Record<string, RepositoryErrorCode>> = {
  QuotaExceededError: 'quota_exceeded',
  ConstraintError: 'conflict',
};

/**
 * Map a thrown storage failure onto a repository error code.
 *
 * Everything unrecognised becomes `unavailable` rather than being passed through. An
 * unknown `DOMException` name is not evidence that the user's data is fine, and the UI
 * copy for `unavailable` — explain, offer retry and export — is the safe response to a
 * failure nobody has classified yet.
 */
export function classifyStorageError(error: unknown): RepositoryErrorCode {
  return STORAGE_ERROR_CODES[errorName(error)] ?? 'unavailable';
}

/**
 * Engineer-facing detail for logs and tests. Never rendered to the user, and never built
 * from capsule content — Document 07 §7 forbids logging capsule text.
 */
export function describeStorageError(error: unknown): string {
  const name = errorName(error);
  const detail = errorMessage(error);
  return name === '' ? detail : `${name}: ${detail}`;
}
