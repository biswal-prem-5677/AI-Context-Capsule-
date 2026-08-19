/**
 * The one capsule repository each extension page uses.
 *
 * Document 14 §4 forbids the UI from touching IndexedDB itself; this module and its
 * siblings in `src/app/` are the application services the UI calls instead. Keeping the
 * construction here means a component never chooses a database name or an `IDBFactory`,
 * and the injection point that makes the storage layer testable (AD-14) is not something
 * a component can accidentally bypass.
 *
 * One instance per page context, not per component. The repository caches its connection
 * promise, so a second instance would open a second connection and each would block the
 * other's upgrade.
 */

import { IndexedDbCapsuleRepository } from '../storage/indexeddb-repository.js';

let repository: IndexedDbCapsuleRepository | null = null;

export function getCapsuleRepository(): IndexedDbCapsuleRepository {
  repository ??= new IndexedDbCapsuleRepository();
  return repository;
}

/**
 * Replace the shared repository. Tests only — it is how a test gives the services an
 * isolated `fake-indexeddb` database instead of the browser's.
 *
 * Exported rather than reached through module internals so the seam is visible and
 * typed. Passing `null` closes the current repository and returns the module to its
 * initial state, which is what keeps one test's database from leaking into the next.
 */
export function setCapsuleRepositoryForTesting(next: IndexedDbCapsuleRepository | null): void {
  repository?.close();
  repository = next;
}
