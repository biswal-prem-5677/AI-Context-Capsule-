/**
 * The executable definition of {@link CapsuleRepository}.
 *
 * Every implementation runs these cases. `MemoryCapsuleRepository` is the reference, and
 * the extension's IndexedDB repository is what users' capsules actually live in — if the
 * two ever disagree about revisions, tombstones, or the undo window, that has to surface
 * as a failing test here rather than as a lost capsule in someone's browser.
 *
 * Deliberately free of any test framework. Importing `vitest` into shipped source would
 * pull vite's and `@types/node`'s ambient declarations into the platform-neutral type
 * program and hand `process` and `Buffer` to this package (AD-07), so the cases throw
 * plain `Error`s and each runner wraps them in whatever `it()` it has.
 *
 * Cases that only one implementation can exercise — simulated quota exhaustion, a
 * corrupt stored record, a database that will not open — stay in that implementation's
 * own test file. This file holds only behaviour every store must share.
 */

import {
  parseCapsuleJson,
  serializeCapsuleJson,
  type Capsule,
} from '@context-capsule/capsule-schema';
import { minimalCapsuleJson, validCapsuleJson } from '@context-capsule/capsule-schema/fixtures';

import { UNDO_WINDOW_MS } from './lifecycle.js';
import {
  type CapsuleRepository,
  type RepositoryErrorCode,
  type RepositoryResult,
} from './repository.js';

function fixture(json: string): Capsule {
  const outcome = parseCapsuleJson(json);
  if (!outcome.ok) {
    throw new Error('A repository contract fixture no longer validates against the schema.');
  }
  return outcome.capsule;
}

/** The capsule most cases operate on. Synthetic content only (Document 12 §7). */
export const primaryContractCapsule: Capsule = fixture(validCapsuleJson);

/** A second, deliberately minimal capsule, so cases can tell one record from another. */
export const secondaryContractCapsule: Capsule = fixture(minimalCapsuleJson);

/** An id in valid UUID form that is never saved, for the "missing record" paths. */
export const ABSENT_CAPSULE_ID = '00000000-0000-4000-8000-000000000000';

/** Fixed rather than `new Date()`, so the undo-window arithmetic is deterministic. */
const DELETED_AT = new Date('2026-08-03T12:00:00.000Z');

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectOk<T>(result: RepositoryResult<T>, context: string): T {
  if (!result.ok) {
    throw new Error(
      `${context}: expected success but got "${result.error.code}" (${result.error.message}).`,
    );
  }
  return result.value;
}

function expectError(
  result: RepositoryResult<unknown>,
  code: RepositoryErrorCode,
  context: string,
): void {
  if (result.ok) {
    throw new Error(`${context}: expected error "${code}" but the call succeeded.`);
  }
  if (result.error.code !== code) {
    throw new Error(
      `${context}: expected error "${code}" but got "${result.error.code}" (${result.error.message}).`,
    );
  }
}

/**
 * Compare through the canonical codec rather than field by field. It is the same
 * definition of "unchanged" that export and import use, so a store that quietly drops an
 * empty array or reorders a list fails here.
 */
function expectSameCapsule(actual: Capsule, expected: Capsule, context: string): void {
  const actualJson = serializeCapsuleJson(actual);
  const expectedJson = serializeCapsuleJson(expected);
  assert(
    actualJson === expectedJson,
    `${context}: the stored capsule differs from the one that was saved.\n` +
      `expected: ${expectedJson}\nactual:   ${actualJson}`,
  );
}

async function listIds(
  repository: CapsuleRepository,
  options?: { readonly includeDeleted?: boolean },
): Promise<string[]> {
  const summaries = expectOk(await repository.list(options), 'list');
  return summaries.map((summary) => summary.id).sort();
}

export interface RepositoryContractCase {
  /** Test name, used verbatim as the `it()` title by every runner. */
  readonly name: string;
  /** Throws on violation. Receives a fresh, empty repository. */
  run(repository: CapsuleRepository): Promise<void>;
}

/**
 * The shared cases, in the order a capsule moves through its life: created, listed,
 * read, edited, deleted, restored, purged.
 */
export const REPOSITORY_CONTRACT_CASES: readonly RepositoryContractCase[] = [
  {
    name: 'returns an empty library before anything is saved',
    async run(repository) {
      const summaries = expectOk(await repository.list(), 'list on an empty store');
      assert(summaries.length === 0, 'A new repository must start empty.');
    },
  },

  {
    name: 'returns a summary carrying what a library row needs',
    async run(repository) {
      await repository.save(primaryContractCapsule);

      const summaries = expectOk(await repository.list(), 'list');
      assert(summaries.length === 1, `Expected one summary, got ${summaries.length}.`);

      const [summary] = summaries;
      assert(summary !== undefined, 'Expected a summary.');
      assert(summary.id === primaryContractCapsule.id, 'Summary id must match the capsule.');
      assert(summary.title === primaryContractCapsule.title, 'Summary must carry the title.');
      assert(
        summary.updatedAt === primaryContractCapsule.updatedAt,
        'Summary must carry updatedAt so the library can sort by recency.',
      );
      assert(
        summary.provider === primaryContractCapsule.source.provider,
        'Summary must carry the source provider.',
      );
      assert(
        summary.nextAction === (primaryContractCapsule.pendingTasks[0] ?? null),
        'Summary must carry the first pending task as the next action.',
      );
      assert(
        summary.tags.join(',') === primaryContractCapsule.tags.join(','),
        'Summary must carry the tags used by the tag filter.',
      );
    },
  },

  {
    name: 'reads back exactly the capsule that was saved',
    async run(repository) {
      await repository.save(primaryContractCapsule);
      const record = expectOk(await repository.get(primaryContractCapsule.id), 'get');
      expectSameCapsule(record.capsule, primaryContractCapsule, 'round trip through storage');
    },
  },

  {
    name: 'reports a missing capsule as not_found rather than throwing',
    async run(repository) {
      expectError(await repository.get(ABSENT_CAPSULE_ID), 'not_found', 'get on a missing id');
    },
  },

  {
    name: 'increments the revision on every write',
    async run(repository) {
      const first = expectOk(await repository.save(primaryContractCapsule), 'first save');
      assert(first.revision === 1, `First write must be revision 1, got ${first.revision}.`);

      const second = expectOk(await repository.save(primaryContractCapsule), 'second save');
      assert(second.revision === 2, `Second write must be revision 2, got ${second.revision}.`);

      const read = expectOk(await repository.get(primaryContractCapsule.id), 'get after save');
      assert(read.revision === 2, 'A re-read must see the revision the write reported.');
    },
  },

  {
    name: 'starts a saved capsule with no tombstone',
    async run(repository) {
      const record = expectOk(await repository.save(primaryContractCapsule), 'save');
      assert(record.deletedAt === null, 'A freshly saved capsule must not be marked deleted.');
    },
  },

  {
    name: 'hides a soft-deleted capsule from the library but keeps it recoverable',
    async run(repository) {
      await repository.save(primaryContractCapsule);
      const deleted = expectOk(
        await repository.softDelete(primaryContractCapsule.id, DELETED_AT),
        'softDelete',
      );
      assert(
        deleted.deletedAt === DELETED_AT.toISOString(),
        'The tombstone must record when the delete happened, so undo can expire.',
      );

      assert((await listIds(repository)).length === 0, 'The library must not show a tombstone.');
      assert(
        (await listIds(repository, { includeDeleted: true })).length === 1,
        'The record must still exist when deleted records are requested.',
      );

      const restored = expectOk(await repository.restore(primaryContractCapsule.id), 'restore');
      assert(restored.deletedAt === null, 'Restore must clear the tombstone.');
      expectSameCapsule(restored.capsule, primaryContractCapsule, 'restore');
      assert((await listIds(repository)).length === 1, 'The library must show it again.');
    },
  },

  {
    name: 'refuses to soft-delete the same capsule twice',
    async run(repository) {
      await repository.save(primaryContractCapsule);
      await repository.softDelete(primaryContractCapsule.id, DELETED_AT);
      expectError(
        await repository.softDelete(primaryContractCapsule.id, DELETED_AT),
        'not_found',
        'second softDelete',
      );
    },
  },

  {
    name: 'revives a soft-deleted capsule when it is saved over',
    async run(repository) {
      await repository.save(primaryContractCapsule);
      await repository.softDelete(primaryContractCapsule.id, DELETED_AT);

      const saved = expectOk(await repository.save(primaryContractCapsule), 'save over tombstone');
      assert(
        saved.deletedAt === null,
        'Editing a capsule you just restored must not leave it pending deletion.',
      );
      assert((await listIds(repository)).length === 1, 'The revived capsule must be listed.');
    },
  },

  {
    name: 'purges only records whose undo window has closed',
    async run(repository) {
      await repository.save(primaryContractCapsule);
      await repository.save(secondaryContractCapsule);
      await repository.softDelete(primaryContractCapsule.id, DELETED_AT);

      const tooSoon = expectOk(
        await repository.purgeExpired(new Date(DELETED_AT.getTime() + UNDO_WINDOW_MS - 1)),
        'purgeExpired inside the undo window',
      );
      assert(
        tooSoon.length === 0,
        'A tombstone inside the undo window must survive; the undo has to outlive the click.',
      );

      const later = expectOk(
        await repository.purgeExpired(new Date(DELETED_AT.getTime() + UNDO_WINDOW_MS)),
        'purgeExpired after the undo window',
      );
      assert(
        later.length === 1 && later[0] === primaryContractCapsule.id,
        `Expected the expired tombstone to be purged, got ${JSON.stringify(later)}.`,
      );

      assert(
        (await listIds(repository, { includeDeleted: true })).join(',') ===
          secondaryContractCapsule.id,
        'Purging expired tombstones must not touch live capsules.',
      );
    },
  },

  {
    name: 'cannot restore a capsule after it has been purged',
    async run(repository) {
      await repository.save(primaryContractCapsule);
      await repository.softDelete(primaryContractCapsule.id, DELETED_AT);
      await repository.purgeExpired(new Date(DELETED_AT.getTime() + UNDO_WINDOW_MS));

      expectError(
        await repository.restore(primaryContractCapsule.id),
        'not_found',
        'restore after purge',
      );
    },
  },

  {
    name: 'purges one capsule permanently',
    async run(repository) {
      await repository.save(primaryContractCapsule);
      await repository.save(secondaryContractCapsule);

      expectOk(await repository.purge(primaryContractCapsule.id), 'purge');
      assert(
        (await listIds(repository, { includeDeleted: true })).join(',') ===
          secondaryContractCapsule.id,
        'purge must remove exactly the requested capsule.',
      );
      expectError(await repository.get(primaryContractCapsule.id), 'not_found', 'get after purge');
    },
  },

  {
    name: 'reports purging an unknown capsule as not_found',
    async run(repository) {
      expectError(await repository.purge(ABSENT_CAPSULE_ID), 'not_found', 'purge on a missing id');
    },
  },

  {
    name: 'clears every capsule, including tombstones',
    async run(repository) {
      await repository.save(primaryContractCapsule);
      await repository.save(secondaryContractCapsule);
      await repository.softDelete(primaryContractCapsule.id, DELETED_AT);

      expectOk(await repository.clear(), 'clear');
      assert(
        (await listIds(repository, { includeDeleted: true })).length === 0,
        '"Clear local data" must leave nothing behind, including deleted records.',
      );
    },
  },

  {
    name: 'stays usable after being cleared',
    async run(repository) {
      await repository.save(primaryContractCapsule);
      await repository.clear();

      const saved = expectOk(await repository.save(primaryContractCapsule), 'save after clear');
      assert(
        saved.revision === 1,
        `A capsule saved after a clear starts a new history, got revision ${saved.revision}.`,
      );
    },
  },
];
