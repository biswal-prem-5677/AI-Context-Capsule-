/**
 * The durable capsule store (Document 07 §6, Document 08 §3).
 *
 * This is where a user's capsules actually live. `MemoryCapsuleRepository` in
 * `capsule-core` is the reference implementation; this one is the product. Both run the
 * shared cases in `capsule-core/repository-contract`, so a disagreement about revisions,
 * tombstones, or the undo window fails a test instead of losing someone's capsule.
 *
 * Three rules shape everything below:
 *
 * 1. **Nothing throws out of a method.** Every failure becomes a `RepositoryErrorCode`
 *    the UI can turn into an accessible sentence (Document 14 §4). A raw `DOMException`
 *    reaching user-facing copy is a defect.
 * 2. **A write is only reported as saved once its transaction commits.** Quota
 *    exhaustion surfaces at commit time, so returning after `put()` succeeded would tell
 *    a user their capsule was saved when it was not (Document 08 §7).
 * 3. **Stored values are validated, not cast.** "We wrote it" is not "it is still
 *    valid" — see `stored-record.ts`. An unreadable record is reported and left on disk,
 *    never silently repaired or dropped.
 */

import {
  UNDO_WINDOW_MS,
  repositoryError,
  toSummary,
  type CapsuleRecord,
  type CapsuleRepository,
  type CapsuleSummary,
  type ListOptions,
  type RepositoryResult,
} from '@context-capsule/capsule-core';
import { type Capsule } from '@context-capsule/capsule-schema';

import {
  CAPSULE_STORE_NAME,
  classifyStorageError,
  describeStorageError,
  openCapsuleDatabase,
  requestResult,
  transactionSettled,
} from './database.js';
import { readStoredDeletedAt, readStoredRecord, readStoredRevision } from './stored-record.js';

/**
 * A record that is on disk but did not survive validation.
 *
 * Surfaced rather than hidden. Document 08 §7 requires unreadable records to be left
 * untouched with a recovery message, which is impossible if the only sign of one is its
 * absence from the library list. `purge` and `clear` still remove these, so a user is
 * never stuck with a record they can neither read nor delete.
 */
export interface UnreadableCapsuleRecord {
  readonly id: string;
  /** Engineer-facing detail, never capsule content — it reaches logs (Document 07 §7). */
  readonly reason: string;
}

export interface IndexedDbCapsuleRepositoryOptions {
  /**
   * Injected so tests can drive a real IndexedDB implementation under Node. Defaults to
   * the browser's own factory, which is what the extension uses.
   */
  readonly factory?: IDBFactory;
  /** Overridden only by tests, so each one gets an isolated database. */
  readonly databaseName?: string;
}

type StoreWork<T> = (store: IDBObjectStore) => Promise<RepositoryResult<T>>;

/**
 * `DOMException` names that mean the cached connection is dead rather than that one
 * request failed. Dropping the connection on these is what makes the "Retry" affordance
 * in Document 08 §7 able to succeed instead of failing identically forever.
 */
const DEAD_CONNECTION_ERRORS: ReadonlySet<string> = new Set([
  'InvalidStateError',
  'TransactionInactiveError',
]);

export class IndexedDbCapsuleRepository implements CapsuleRepository {
  readonly #factory: IDBFactory;
  readonly #databaseName: string | undefined;

  /**
   * The in-flight or established connection, cached as a *promise* rather than a
   * database. Two concurrent calls on a cold repository would otherwise each start their
   * own `open()`, and the second would sit behind the first as a blocked upgrade.
   */
  #connection: Promise<IDBDatabase> | null = null;

  constructor(options: IndexedDbCapsuleRepositoryOptions = {}) {
    this.#factory = options.factory ?? indexedDB;
    this.#databaseName = options.databaseName;
  }

  /**
   * Release the connection. Safe to call more than once, and the repository reopens on
   * the next call — closing is not the end of the object's life.
   */
  close(): void {
    const pending = this.#connection;
    this.#connection = null;
    if (pending === null) return;
    pending.then(
      (database) => {
        database.close();
      },
      () => {
        // The connection never opened, so there is nothing to close. The original
        // rejection was already reported to whichever call was awaiting it.
      },
    );
  }

  list(options: ListOptions = {}): Promise<RepositoryResult<readonly CapsuleSummary[]>> {
    const includeDeleted = options.includeDeleted ?? false;

    return this.#run('readonly', async (store) => {
      const entries = await requestResult(store.getAll() as IDBRequest<unknown[]>);

      const summaries: CapsuleSummary[] = [];
      for (const entry of entries) {
        const outcome = readStoredRecord(entry);
        // An unreadable record cannot produce a library row, and failing the whole list
        // over one bad record would take the entire library down with it. It stays on
        // disk and is reported by `listUnreadable`.
        if (!outcome.ok) continue;
        if (!includeDeleted && outcome.record.deletedAt !== null) continue;
        summaries.push(toSummary(outcome.record.capsule));
      }
      return { ok: true, value: summaries };
    });
  }

  /**
   * Every record that failed validation, with the reason it failed.
   *
   * Not part of {@link CapsuleRepository}: an in-memory store cannot corrupt a record, so
   * a contract method would be permanently empty there. It is the recovery entry point
   * the options UI uses in Milestone 1b to offer purge or raw export.
   */
  listUnreadable(): Promise<RepositoryResult<readonly UnreadableCapsuleRecord[]>> {
    return this.#run('readonly', async (store) => {
      const unreadable = await collectUnreadable(store);
      return { ok: true, value: unreadable };
    });
  }

  get(id: string): Promise<RepositoryResult<CapsuleRecord>> {
    return this.#run('readonly', async (store) => {
      const entry = await requestResult(store.get(id) as IDBRequest<unknown>);
      if (entry === undefined) {
        return repositoryError('not_found', `No capsule with id ${id}.`);
      }

      const outcome = readStoredRecord(entry);
      if (!outcome.ok) {
        return repositoryError(
          'corrupt_record',
          `Capsule ${id} could not be read: ${outcome.reason}`,
        );
      }
      return { ok: true, value: outcome.record };
    });
  }

  save(capsule: Capsule): Promise<RepositoryResult<CapsuleRecord>> {
    return this.#run('readwrite', async (store) => {
      const existing = await requestResult(store.get(capsule.id) as IDBRequest<unknown>);

      // `readStoredRevision` rather than `readStoredRecord`: saving over a record that no
      // longer validates is a repair, and a repair must not restart the revision count.
      // Saving over a tombstone revives it, which is what "edit the capsule I just
      // restored" has to mean.
      const record: CapsuleRecord = {
        capsule,
        revision: readStoredRevision(existing) + 1,
        deletedAt: null,
      };

      await requestResult(store.put(record));
      return { ok: true, value: record };
    });
  }

  softDelete(id: string, now: Date): Promise<RepositoryResult<CapsuleRecord>> {
    return this.#mutate(id, (record) => {
      if (record.deletedAt !== null) {
        return repositoryError('not_found', `No live capsule with id ${id}.`);
      }
      return {
        ok: true,
        value: { ...record, revision: record.revision + 1, deletedAt: now.toISOString() },
      };
    });
  }

  restore(id: string): Promise<RepositoryResult<CapsuleRecord>> {
    return this.#mutate(
      id,
      (record) => ({
        ok: true,
        value: { ...record, revision: record.revision + 1, deletedAt: null },
      }),
      `Capsule ${id} is no longer recoverable.`,
    );
  }

  purge(id: string): Promise<RepositoryResult<void>> {
    return this.#run('readwrite', async (store) => {
      // `count` rather than `get`: existence is the only question, and there is no reason
      // to deserialize a whole capsule to answer it. It also means a record too corrupt
      // to read can still be deleted, which is the user's way out of one.
      const present = await requestResult(store.count(id));
      if (present === 0) {
        return repositoryError('not_found', `No capsule with id ${id}.`);
      }

      await requestResult(store.delete(id));
      return { ok: true, value: undefined };
    });
  }

  purgeExpired(now: Date): Promise<RepositoryResult<readonly string[]>> {
    return this.#run('readwrite', async (store) => {
      const purged = await deleteExpired(store, now);
      return { ok: true, value: purged };
    });
  }

  clear(): Promise<RepositoryResult<void>> {
    return this.#run('readwrite', async (store) => {
      await requestResult(store.clear());
      return { ok: true, value: undefined };
    });
  }

  /**
   * Read one record, transform it, and write the result back inside a single
   * transaction.
   *
   * One transaction rather than a read call followed by a write call: IndexedDB
   * serializes overlapping `readwrite` transactions on the same store, so this is what
   * stops two concurrent edits from reading the same revision and both writing revision
   * n+1.
   */
  #mutate(
    id: string,
    change: (record: CapsuleRecord) => RepositoryResult<CapsuleRecord>,
    missingMessage = `No capsule with id ${id}.`,
  ): Promise<RepositoryResult<CapsuleRecord>> {
    return this.#run('readwrite', async (store) => {
      const entry = await requestResult(store.get(id) as IDBRequest<unknown>);
      if (entry === undefined) {
        return repositoryError('not_found', missingMessage);
      }

      const outcome = readStoredRecord(entry);
      if (!outcome.ok) {
        // Deliberately not rewritten with a repaired value: the record is left exactly as
        // it is (Document 08 §7). `save` is the repair path, `purge` the removal path.
        return repositoryError(
          'corrupt_record',
          `Capsule ${id} could not be read: ${outcome.reason}`,
        );
      }

      const changed = change(outcome.record);
      if (!changed.ok) return changed;

      await requestResult(store.put(changed.value));
      return changed;
    });
  }

  /**
   * Open a transaction, run the work, and only report success once the transaction has
   * committed.
   *
   * The commit listener is attached before any request is issued: a transaction can
   * finish while the work is still awaiting, and a `oncomplete` handler attached after
   * that point would never fire, hanging the caller forever.
   */
  async #run<T>(mode: IDBTransactionMode, work: StoreWork<T>): Promise<RepositoryResult<T>> {
    let database: IDBDatabase;
    try {
      database = await this.#open();
    } catch (error) {
      return this.#failure(error);
    }

    try {
      const transaction = database.transaction(CAPSULE_STORE_NAME, mode);
      const settled = transactionSettled(transaction);
      settled.catch(() => {
        // Observed here as well as below. When `work` throws — a quota failure raised
        // straight out of `put`, for instance — nothing awaits `settled`, and the abort
        // that follows would otherwise surface as an unhandled rejection somewhere
        // unrelated to the call that caused it.
      });

      const outcome = await work(transaction.objectStore(CAPSULE_STORE_NAME));

      // Awaited even when `outcome` is a domain failure such as `not_found`. Nothing was
      // written in that case, so the commit is a no-op, but leaving the promise
      // unobserved would turn a later abort into an unhandled rejection.
      await settled;
      return outcome;
    } catch (error) {
      return this.#failure(error);
    }
  }

  #open(): Promise<IDBDatabase> {
    if (this.#connection !== null) return this.#connection;

    const pending: Promise<IDBDatabase> = openCapsuleDatabase(
      this.#factory,
      this.#databaseName,
    ).then((database) => {
      // Another context is upgrading. Holding the old connection open would block it
      // indefinitely, so this one steps aside and the next call reopens.
      database.onversionchange = () => {
        database.close();
        this.#forget(pending);
      };
      // The connection was closed out from under us — storage evicted, or the database
      // deleted. Dropping the cache is what lets a retry reopen instead of reusing a
      // handle that can only fail.
      database.onclose = () => {
        this.#forget(pending);
      };
      return database;
    });

    pending.catch(() => {
      this.#forget(pending);
    });

    this.#connection = pending;
    return pending;
  }

  /** Drop the cached connection, but only if it is still the one being replaced. */
  #forget(pending: Promise<IDBDatabase>): void {
    if (this.#connection === pending) this.#connection = null;
  }

  #failure<T>(error: unknown): RepositoryResult<T> {
    if (DEAD_CONNECTION_ERRORS.has(errorName(error))) this.#connection = null;
    return repositoryError(classifyStorageError(error), describeStorageError(error));
  }
}

function errorName(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const { name } = error;
    if (typeof name === 'string') return name;
  }
  return '';
}

/**
 * The primary key of a stored record, when it is a capsule id.
 *
 * Keys are extracted from `capsule.id` at write time and a validated capsule id is always
 * a UUID string, so a key of any other type did not come from this extension. Such a
 * record is skipped rather than stringified: `String()` on a `Date` or an array produces
 * something that reads like an id and cannot be passed back to `purge`, and both callers
 * below act on the value — one reports it for recovery, the other deletes it. Neither may
 * act on a key it does not understand. `clear` still removes these.
 */
function capsuleKey(key: IDBValidKey): string | null {
  return typeof key === 'string' ? key : null;
}

/**
 * Walk every record and collect the ones that fail validation.
 *
 * A cursor rather than `getAll`, because an unreadable record is identified by its
 * primary key: the value is exactly what could not be trusted to carry an id.
 */
function collectUnreadable(store: IDBObjectStore): Promise<UnreadableCapsuleRecord[]> {
  return new Promise((resolve, reject) => {
    const request = store.openCursor();
    const unreadable: UnreadableCapsuleRecord[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor === null) {
        resolve(unreadable);
        return;
      }

      const value: unknown = cursor.value;
      const outcome = readStoredRecord(value);
      const id = capsuleKey(cursor.primaryKey);
      if (!outcome.ok && id !== null) {
        unreadable.push({ id, reason: outcome.reason });
      }
      cursor.continue();
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Reading the local capsule library failed.'));
    };
  });
}

/**
 * Delete tombstones whose undo window has closed, returning the ids removed.
 *
 * A record whose deletion timestamp cannot be read is skipped, not deleted: `purgeExpired`
 * runs on a schedule with nobody watching, so an unevaluable undo window must never be
 * resolved in favour of destroying data.
 */
function deleteExpired(store: IDBObjectStore, now: Date): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const request = store.openCursor();
    const purged: string[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor === null) {
        resolve(purged);
        return;
      }

      const value: unknown = cursor.value;
      const deletedAt = readStoredDeletedAt(value);
      const id = capsuleKey(cursor.primaryKey);
      if (
        id !== null &&
        deletedAt !== null &&
        now.getTime() - Date.parse(deletedAt) >= UNDO_WINDOW_MS
      ) {
        purged.push(id);
        cursor.delete();
      }
      cursor.continue();
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Purging expired local capsules failed.'));
    };
  });
}
