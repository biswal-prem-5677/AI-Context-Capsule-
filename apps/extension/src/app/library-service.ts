/**
 * The library commands the UI is allowed to call.
 *
 * Document 14 §4: "UI dispatches commands through application services; it does not query
 * IndexedDB." A component that called `getCapsuleRepository().list()` itself would be one
 * refactor away from also choosing a database name, holding a second connection, or
 * deciding what a `quota_exceeded` means — so the repository stays behind this module and
 * components import from here.
 *
 * Errors are passed through as {@link RepositoryError} rather than translated to copy.
 * The translation lives in `messages.ts` and belongs to the surface doing the rendering:
 * the same `unavailable` reads differently in a popup that can retry than in an options
 * page that cannot, and a service that picked one sentence would force the other surface
 * to lie.
 */

import { type CapsuleSummary, type RepositoryResult } from '@context-capsule/capsule-core';

import { getCapsuleRepository } from './repository.js';

/**
 * Every live capsule, as summaries.
 *
 * Unsorted and unfiltered on purpose: `queryLibrary` in `capsule-core` owns search and
 * sort as pure functions over the result, so the popup can re-filter on every keystroke
 * without a storage round trip (Document 12 §7 targets 500 capsules under 200 ms).
 *
 * Soft-deleted capsules are excluded, which is the repository's default. A record inside
 * its undo window still exists; the library is simply not where it is shown. No
 * `includeDeleted` parameter is exposed until a surface exists that would pass it —
 * an option no caller sets is an untested code path with a name.
 */
export function listCapsules(): Promise<RepositoryResult<readonly CapsuleSummary[]>> {
  return getCapsuleRepository().list();
}
