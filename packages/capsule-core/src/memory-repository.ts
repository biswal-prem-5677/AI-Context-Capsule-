/**
 * In-memory reference implementation of {@link CapsuleRepository}.
 *
 * Two jobs. It makes core and UI tests deterministic without a browser, and it is the
 * executable definition of what the IndexedDB implementation has to do — the same test
 * suite runs against both, so "the real one behaves differently" becomes a failing test
 * rather than a surprise in a user's browser.
 *
 * It is not durable and is never a user data store: Document 07 §6 requires user data to
 * live in IndexedDB, and `EXECUTION_RULES.md` §5.4 forbids treating memory as durable
 * state.
 */

import { type Capsule } from '@context-capsule/capsule-schema';

import { UNDO_WINDOW_MS } from './lifecycle.js';
import {
  repositoryError,
  toSummary,
  type CapsuleRecord,
  type CapsuleRepository,
  type CapsuleSummary,
  type ListOptions,
  type RepositoryResult,
} from './repository.js';

export class MemoryCapsuleRepository implements CapsuleRepository {
  readonly #records = new Map<string, CapsuleRecord>();

  /**
   * Simulates browser storage exhaustion. Set by tests so the quota path is exercised
   * against the same contract the IndexedDB implementation reports.
   */
  quotaExceeded = false;

  list(options: ListOptions = {}): Promise<RepositoryResult<readonly CapsuleSummary[]>> {
    const includeDeleted = options.includeDeleted ?? false;
    const summaries: CapsuleSummary[] = [];
    for (const record of this.#records.values()) {
      if (!includeDeleted && record.deletedAt !== null) continue;
      summaries.push(toSummary(record.capsule));
    }
    return Promise.resolve({ ok: true, value: summaries });
  }

  get(id: string): Promise<RepositoryResult<CapsuleRecord>> {
    const record = this.#records.get(id);
    if (record === undefined) {
      return Promise.resolve(repositoryError('not_found', `No capsule with id ${id}.`));
    }
    return Promise.resolve({ ok: true, value: record });
  }

  save(capsule: Capsule): Promise<RepositoryResult<CapsuleRecord>> {
    if (this.quotaExceeded) {
      return Promise.resolve(
        repositoryError('quota_exceeded', 'Browser storage is full; nothing was written.'),
      );
    }
    const previous = this.#records.get(capsule.id);
    // Saving over a soft-deleted record revives it: editing a capsule you just restored
    // must not leave it pending deletion.
    const record: CapsuleRecord = {
      capsule,
      revision: (previous?.revision ?? 0) + 1,
      deletedAt: null,
    };
    this.#records.set(capsule.id, record);
    return Promise.resolve({ ok: true, value: record });
  }

  softDelete(id: string, now: Date): Promise<RepositoryResult<CapsuleRecord>> {
    const record = this.#records.get(id);
    if (record === undefined || record.deletedAt !== null) {
      return Promise.resolve(repositoryError('not_found', `No live capsule with id ${id}.`));
    }
    const deleted: CapsuleRecord = {
      ...record,
      revision: record.revision + 1,
      deletedAt: now.toISOString(),
    };
    this.#records.set(id, deleted);
    return Promise.resolve({ ok: true, value: deleted });
  }

  restore(id: string): Promise<RepositoryResult<CapsuleRecord>> {
    const record = this.#records.get(id);
    if (record === undefined) {
      return Promise.resolve(
        repositoryError('not_found', `Capsule ${id} is no longer recoverable.`),
      );
    }
    const restored: CapsuleRecord = {
      ...record,
      revision: record.revision + 1,
      deletedAt: null,
    };
    this.#records.set(id, restored);
    return Promise.resolve({ ok: true, value: restored });
  }

  purge(id: string): Promise<RepositoryResult<void>> {
    if (!this.#records.delete(id)) {
      return Promise.resolve(repositoryError('not_found', `No capsule with id ${id}.`));
    }
    return Promise.resolve({ ok: true, value: undefined });
  }

  purgeExpired(now: Date): Promise<RepositoryResult<readonly string[]>> {
    const purged: string[] = [];
    for (const [id, record] of this.#records) {
      if (record.deletedAt === null) continue;
      if (now.getTime() - Date.parse(record.deletedAt) < UNDO_WINDOW_MS) continue;
      this.#records.delete(id);
      purged.push(id);
    }
    return Promise.resolve({ ok: true, value: purged });
  }

  clear(): Promise<RepositoryResult<void>> {
    this.#records.clear();
    return Promise.resolve({ ok: true, value: undefined });
  }
}
