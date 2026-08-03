/**
 * Library search and sort (Document 02 F-04).
 *
 * Pure functions over {@link CapsuleSummary}, deliberately kept out of the repository.
 * Document 12 §7 sets the target at 500 local capsules with sub-200 ms search; filtering
 * that many summaries in memory is not the bottleneck, and keeping the query rules here
 * means they are testable without a storage round trip and do not have to be rewritten
 * for every future store.
 */

import { type CaptureProvider } from '@context-capsule/capsule-schema';

import { type CapsuleSummary } from './repository.js';

export const LIBRARY_SORTS = ['updated_desc', 'updated_asc', 'title_asc', 'title_desc'] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

/** Document 02 F-04: sort by last updated by default. */
export const DEFAULT_LIBRARY_SORT: LibrarySort = 'updated_desc';

export interface LibraryQuery {
  /** Free text matched against title, next action, and tags. */
  readonly text?: string;
  readonly provider?: CaptureProvider;
  readonly tag?: string;
  readonly sort?: LibrarySort;
}

/**
 * Fold case and accents so that "Résumé" matches "resume".
 *
 * NFD splits a letter from its combining mark, and the mark range is then stripped —
 * a search box that only matched exact diacritics would quietly hide a user's own
 * capsules from them.
 */
function foldForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matchesText(summary: CapsuleSummary, needle: string): boolean {
  const haystack = [summary.title, summary.nextAction ?? '', ...summary.tags]
    .map(foldForSearch)
    .join('\n');
  return haystack.includes(needle);
}

/**
 * Compare titles for display order.
 *
 * `localeCompare` rather than `<`, so that ordering follows the reader's alphabet instead
 * of UTF-16 code-unit order, which would sort "Zebra" before "apple".
 */
function byTitle(left: CapsuleSummary, right: CapsuleSummary): number {
  return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
}

function byUpdated(left: CapsuleSummary, right: CapsuleSummary): number {
  const difference = Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
  // Ties fall back to title so the list order is stable between renders rather than
  // depending on whatever order the store happened to return.
  return difference === 0 ? byTitle(left, right) : difference;
}

const COMPARATORS: Readonly<
  Record<LibrarySort, (left: CapsuleSummary, right: CapsuleSummary) => number>
> = {
  updated_desc: (left, right) => byUpdated(right, left),
  updated_asc: byUpdated,
  title_asc: byTitle,
  title_desc: (left, right) => byTitle(right, left),
};

/**
 * Filter and sort a library listing. Never mutates its input.
 *
 * An empty or whitespace-only search is treated as no search rather than as a search for
 * nothing, so clearing the box restores the full list.
 */
export function queryLibrary(
  summaries: readonly CapsuleSummary[],
  query: LibraryQuery = {},
): readonly CapsuleSummary[] {
  const needle = query.text === undefined ? '' : foldForSearch(query.text.trim());
  const tag = query.tag === undefined ? '' : foldForSearch(query.tag.trim());

  const filtered = summaries.filter((summary) => {
    if (query.provider !== undefined && summary.provider !== query.provider) return false;
    if (tag !== '' && !summary.tags.some((candidate) => foldForSearch(candidate) === tag)) {
      return false;
    }
    if (needle !== '' && !matchesText(summary, needle)) return false;
    return true;
  });

  return [...filtered].sort(COMPARATORS[query.sort ?? DEFAULT_LIBRARY_SORT]);
}

/** Every tag in the library with its use count, most used first. Drives tag filters. */
export function collectTags(
  summaries: readonly CapsuleSummary[],
): readonly { readonly tag: string; readonly count: number }[] {
  const counts = new Map<string, number>();
  for (const summary of summaries) {
    for (const tag of summary.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));
}
