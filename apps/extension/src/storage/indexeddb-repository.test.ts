import {
  REPOSITORY_CONTRACT_CASES,
  primaryContractCapsule,
  secondaryContractCapsule,
} from '@context-capsule/capsule-core/repository-contract';
import { IDBFactory as FakeIdbFactory, IDBObjectStore as FakeIdbObjectStore } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CAPSULE_STORE_NAME, openCapsuleDatabase, transactionSettled } from './database.js';
import { IndexedDbCapsuleRepository } from './indexeddb-repository.js';

/**
 * A fresh {@link IDBFactory} per test rather than a shared one with a unique database
 * name. Isolation is then a property of the fixture instead of a naming convention that
 * one forgetful test can break.
 */
let factory: IDBFactory;
let repository: IndexedDbCapsuleRepository;

beforeEach(() => {
  factory = new FakeIdbFactory();
  repository = new IndexedDbCapsuleRepository({ factory });
});

/** Write a value straight into the store, bypassing every validation the repository does. */
async function putRaw(value: unknown): Promise<void> {
  const database = await openCapsuleDatabase(factory);
  try {
    const transaction = database.transaction(CAPSULE_STORE_NAME, 'readwrite');
    const settled = transactionSettled(transaction);
    transaction.objectStore(CAPSULE_STORE_NAME).put(value);
    await settled;
  } finally {
    database.close();
  }
}

/** A record whose envelope is unreadable but whose in-line key still resolves. */
function corruptEntry(id: string, revision = 4): unknown {
  return { capsule: { id, title: 42 }, revision, deletedAt: null };
}

describe('IndexedDbCapsuleRepository', () => {
  // The same list the in-memory reference runs. If the two ever disagree about revisions,
  // tombstones, or the undo window, it fails here rather than in a user's browser.
  describe('repository contract', () => {
    for (const contractCase of REPOSITORY_CONTRACT_CASES) {
      it(contractCase.name, async () => {
        await contractCase.run(repository);
      });
    }
  });

  describe('durability', () => {
    it('persists across a closed connection', async () => {
      await repository.save(primaryContractCapsule);
      repository.close();

      const record = await repository.get(primaryContractCapsule.id);
      expect(record.ok).toBe(true);
      expect(record.ok && record.value.revision).toBe(1);
    });

    it('is readable by a second repository over the same database', async () => {
      await repository.save(primaryContractCapsule);

      const other = new IndexedDbCapsuleRepository({ factory });
      const summaries = await other.list();
      expect(summaries.ok && summaries.value.map((entry) => entry.id)).toEqual([
        primaryContractCapsule.id,
      ]);
    });

    it('gives concurrent writes distinct revisions', async () => {
      // The read and the write share one transaction, so the second save cannot observe
      // the same revision as the first. Two separate transactions would produce [1, 1]
      // and silently lose an edit.
      const [first, second] = await Promise.all([
        repository.save(primaryContractCapsule),
        repository.save(primaryContractCapsule),
      ]);

      expect(first.ok && second.ok).toBe(true);
      const revisions = [
        first.ok ? first.value.revision : 0,
        second.ok ? second.value.revision : 0,
      ].sort();
      expect(revisions).toEqual([1, 2]);
    });
  });

  // Document 08 §7: unreadable records are left untouched with a recovery message, never
  // silently repaired or dropped. Only a real store can produce one, so these cases live
  // here rather than in the shared contract.
  describe('a record that no longer validates', () => {
    beforeEach(async () => {
      await repository.save(primaryContractCapsule);
      await putRaw(corruptEntry(secondaryContractCapsule.id));
    });

    it('reports it as corrupt_record instead of returning a capsule', async () => {
      const result = await repository.get(secondaryContractCapsule.id);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error.code).toBe('corrupt_record');
    });

    it('keeps the rest of the library listable', async () => {
      const summaries = await repository.list();
      expect(summaries.ok && summaries.value.map((entry) => entry.id)).toEqual([
        primaryContractCapsule.id,
      ]);
    });

    it('surfaces it through listUnreadable so recovery is possible', async () => {
      const unreadable = await repository.listUnreadable();
      expect(unreadable.ok).toBe(true);
      expect(unreadable.ok && unreadable.value.map((entry) => entry.id)).toEqual([
        secondaryContractCapsule.id,
      ]);
      expect(unreadable.ok && unreadable.value[0]?.reason).toContain('failed validation');
    });

    it('refuses to soft-delete or restore it rather than writing a guess back', async () => {
      const deleted = await repository.softDelete(secondaryContractCapsule.id, new Date());
      expect(!deleted.ok && deleted.error.code).toBe('corrupt_record');

      const restored = await repository.restore(secondaryContractCapsule.id);
      expect(!restored.ok && restored.error.code).toBe('corrupt_record');
    });

    it('leaves it on disk, exactly as it was', async () => {
      await repository.softDelete(secondaryContractCapsule.id, new Date());

      const unreadable = await repository.listUnreadable();
      expect(unreadable.ok && unreadable.value.length).toBe(1);
    });

    it('lets the user delete it', async () => {
      const purged = await repository.purge(secondaryContractCapsule.id);
      expect(purged.ok).toBe(true);

      const unreadable = await repository.listUnreadable();
      expect(unreadable.ok && unreadable.value).toEqual([]);
    });

    it('is repaired by saving over it, without restarting the revision count', async () => {
      const saved = await repository.save(secondaryContractCapsule);
      expect(saved.ok).toBe(true);
      // The stored revision was 4, so the repair is revision 5. Restarting at 1 would let
      // an older editor believe its stale copy is current.
      expect(saved.ok && saved.value.revision).toBe(5);

      const unreadable = await repository.listUnreadable();
      expect(unreadable.ok && unreadable.value).toEqual([]);
    });

    it('is never purged by the scheduled sweep', async () => {
      // Its deletion timestamp cannot be read, so the undo window cannot be evaluated.
      // A sweep that nobody is watching must not resolve that in favour of deleting.
      const purged = await repository.purgeExpired(new Date('2099-01-01T00:00:00.000Z'));
      expect(purged.ok && purged.value).toEqual([]);

      const unreadable = await repository.listUnreadable();
      expect(unreadable.ok && unreadable.value.length).toBe(1);
    });
  });

  describe('storage failures', () => {
    it('reports an unopenable database as unavailable rather than throwing', async () => {
      const blocked = new IndexedDbCapsuleRepository({
        factory: {
          open() {
            throw new DOMException('Site data is blocked.', 'SecurityError');
          },
        } as unknown as IDBFactory,
      });

      const result = await blocked.list();
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error.code).toBe('unavailable');
      expect(!result.ok && result.error.message).toContain('SecurityError');
    });

    it('reports quota exhaustion without losing what was already stored', async () => {
      await repository.save(primaryContractCapsule);

      vi.spyOn(FakeIdbObjectStore.prototype, 'put').mockImplementation(() => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      });

      const result = await repository.save(secondaryContractCapsule);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error.code).toBe('quota_exceeded');

      const survivors = await repository.list();
      expect(survivors.ok && survivors.value.map((entry) => entry.id)).toEqual([
        primaryContractCapsule.id,
      ]);
    });

    it('recovers on the next call after a failed write', async () => {
      const put = vi.spyOn(FakeIdbObjectStore.prototype, 'put').mockImplementation(() => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      });
      await repository.save(primaryContractCapsule);
      put.mockRestore();

      // Document 08 §7 offers retry as a recovery path; a retry that can only fail the
      // same way is not one.
      const retried = await repository.save(primaryContractCapsule);
      expect(retried.ok).toBe(true);
      expect(retried.ok && retried.value.revision).toBe(1);
    });
  });

  describe('connection handling', () => {
    it('survives another context asking for an upgrade', async () => {
      await repository.save(primaryContractCapsule);

      // `onversionchange` closes the cached connection so the other context is not
      // blocked. The next call has to reopen rather than reuse a closed handle.
      const other = await openCapsuleDatabase(factory);
      other.close();

      const record = await repository.get(primaryContractCapsule.id);
      expect(record.ok).toBe(true);
    });

    it('tolerates close() being called more than once, and before anything is opened', async () => {
      repository.close();
      repository.close();

      const saved = await repository.save(primaryContractCapsule);
      expect(saved.ok).toBe(true);

      repository.close();
      repository.close();

      const summaries = await repository.list();
      expect(summaries.ok && summaries.value.length).toBe(1);
    });
  });
});
