/**
 * The capsule repository contract (Document 14 §4).
 *
 * Storage is an injected interface, not a concrete import. Document 07 §6 puts the real
 * IndexedDB implementation in the extension application layer; core, and every UI built
 * on it, depends only on this file. That is what lets library, lifecycle, and prompt
 * logic be tested without a browser, and what will let the same logic run against a
 * different store later without touching product code.
 *
 * Every method returns a {@link RepositoryResult} rather than throwing. Document 14 §4
 * requires commands to return typed error codes that the UI maps to accessible copy: a
 * raw `DOMException` from a quota failure must never reach a user-facing string.
 */

import { type Capsule, type CaptureProvider } from '@context-capsule/capsule-schema';

export const REPOSITORY_ERROR_CODES = [
  /** No capsule with that id, or it was already purged. */
  'not_found',
  /** Browser storage is full. Prior data is intact; the write did not happen. */
  'quota_exceeded',
  /** IndexedDB is unavailable — private window, blocked upgrade, or a closed database. */
  'unavailable',
  /** The stored record failed validation on read, so it is not returned as a capsule. */
  'corrupt_record',
  /** A concurrent write moved the record on; the caller holds a stale revision. */
  'conflict',
] as const;

export type RepositoryErrorCode = (typeof REPOSITORY_ERROR_CODES)[number];

export interface RepositoryError {
  readonly code: RepositoryErrorCode;
  /** Engineer-facing detail for logs and tests. UI copy is chosen from `code`. */
  readonly message: string;
}

export type RepositoryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: RepositoryError };

export function repositoryError(
  code: RepositoryErrorCode,
  message: string,
): { readonly ok: false; readonly error: RepositoryError } {
  return { ok: false, error: { code, message } };
}

/**
 * A capsule as stored locally (Document 08 §3).
 *
 * `revision` increments on every write so a later editor can detect that the record moved
 * underneath it. `deletedAt` carries the soft delete that makes undo possible; a record
 * with a `deletedAt` still exists and is still recoverable.
 *
 * There is deliberately no sync field. Sync is 1B and is not open, and adding a column
 * for it now would be exactly the "groundwork" that `EXECUTION_RULES.md` §2 forbids.
 */
export interface CapsuleRecord {
  readonly capsule: Capsule;
  readonly revision: number;
  readonly deletedAt: string | null;
}

/**
 * What the library list needs to render a row (Document 02 F-04): title, last updated
 * time, source provider, and the next action where one exists.
 *
 * A summary rather than a whole capsule, so listing 500 capsules does not deserialize
 * 500 full envelopes to draw a list.
 */
export interface CapsuleSummary {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly provider: CaptureProvider;
  /** First pending task, or null when the capsule somehow has none. */
  readonly nextAction: string | null;
  readonly tags: readonly string[];
}

export function toSummary(capsule: Capsule): CapsuleSummary {
  return {
    id: capsule.id,
    title: capsule.title,
    updatedAt: capsule.updatedAt,
    provider: capsule.source.provider,
    nextAction: capsule.pendingTasks[0] ?? null,
    tags: capsule.tags,
  };
}

export interface ListOptions {
  /** Include soft-deleted records. Off by default; the library must not show them. */
  readonly includeDeleted?: boolean;
}

/**
 * Durable capsule storage.
 *
 * Search and sort are deliberately absent: they are pure functions over summaries in
 * `library.ts`, so they can be tested and changed without a storage round trip. At the
 * 500-capsule target in Document 12 §7 the cost of listing and filtering in memory is
 * not the bottleneck, and a query language pushed into the store would have to be
 * reimplemented for every future backend.
 */
export interface CapsuleRepository {
  /** Summaries of every live capsule, in unspecified order. */
  list(options?: ListOptions): Promise<RepositoryResult<readonly CapsuleSummary[]>>;

  get(id: string): Promise<RepositoryResult<CapsuleRecord>>;

  /**
   * Insert or replace a capsule. Writing over a soft-deleted record revives it, which is
   * what "edit the capsule I just restored" has to mean.
   */
  save(capsule: Capsule): Promise<RepositoryResult<CapsuleRecord>>;

  /** Mark deleted and start the undo window. The capsule is still recoverable. */
  softDelete(id: string, now: Date): Promise<RepositoryResult<CapsuleRecord>>;

  /** Undo a soft delete. Fails with `not_found` once the record has been purged. */
  restore(id: string): Promise<RepositoryResult<CapsuleRecord>>;

  /** Permanent removal of one capsule. Not recoverable. */
  purge(id: string): Promise<RepositoryResult<void>>;

  /**
   * Permanently remove soft-deleted records whose undo window has closed, returning the
   * ids removed. Called on a bounded schedule (Document 08 §3), never automatically
   * during a user's delete action — the undo has to outlive the click.
   */
  purgeExpired(now: Date): Promise<RepositoryResult<readonly string[]>>;

  /**
   * Remove every capsule. Backs the settings "clear local data" action, which
   * Document 02 F-04 requires to be explicit and to name what it removes.
   */
  clear(): Promise<RepositoryResult<void>>;
}
