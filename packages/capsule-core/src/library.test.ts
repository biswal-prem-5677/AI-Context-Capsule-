import { describe, expect, it } from 'vitest';

import { collectTags, queryLibrary } from './library.js';
import { type CapsuleSummary } from './repository.js';

function summary(overrides: Partial<CapsuleSummary> & Pick<CapsuleSummary, 'id'>): CapsuleSummary {
  return {
    title: 'Untitled',
    updatedAt: '2026-07-01T00:00:00.000Z',
    provider: 'manual',
    nextAction: null,
    tags: [],
    ...overrides,
  };
}

const library: readonly CapsuleSummary[] = [
  summary({
    id: 'a',
    title: 'Dashboard auth',
    updatedAt: '2026-07-03T00:00:00.000Z',
    provider: 'chatgpt',
    nextAction: 'Build the login screen',
    tags: ['coding', 'dashboard'],
  }),
  summary({
    id: 'b',
    title: 'Pricing copy',
    updatedAt: '2026-07-01T00:00:00.000Z',
    provider: 'claude',
    nextAction: 'Choose a headline',
    tags: ['writing'],
  }),
  summary({
    id: 'c',
    title: 'Résumé review',
    updatedAt: '2026-07-02T00:00:00.000Z',
    provider: 'gemini',
    tags: ['writing', 'coding'],
  }),
];

describe('queryLibrary', () => {
  it('sorts by last updated, newest first, by default', () => {
    expect(queryLibrary(library).map((entry) => entry.id)).toEqual(['a', 'c', 'b']);
  });

  it('does not mutate the input array', () => {
    const original = [...library];
    queryLibrary(library, { sort: 'title_asc' });
    expect(library).toEqual(original);
  });

  it('treats a blank search as no search', () => {
    expect(queryLibrary(library, { text: '   ' })).toHaveLength(library.length);
  });

  it('matches title, next action, and tag text', () => {
    expect(queryLibrary(library, { text: 'dashboard' }).map((entry) => entry.id)).toEqual(['a']);
    expect(queryLibrary(library, { text: 'headline' }).map((entry) => entry.id)).toEqual(['b']);
    expect(queryLibrary(library, { text: 'writing' }).map((entry) => entry.id)).toEqual(['c', 'b']);
  });

  it('ignores case and accents so a search finds the user their own capsule', () => {
    expect(queryLibrary(library, { text: 'resume' }).map((entry) => entry.id)).toEqual(['c']);
    expect(queryLibrary(library, { text: 'RÉSUMÉ' }).map((entry) => entry.id)).toEqual(['c']);
  });

  it('filters by provider and by exact tag', () => {
    expect(queryLibrary(library, { provider: 'claude' }).map((entry) => entry.id)).toEqual(['b']);
    expect(queryLibrary(library, { tag: 'coding' }).map((entry) => entry.id)).toEqual(['a', 'c']);
  });

  it('combines filters conjunctively', () => {
    expect(queryLibrary(library, { tag: 'coding', provider: 'gemini' }).map((e) => e.id)).toEqual([
      'c',
    ]);
    expect(queryLibrary(library, { tag: 'coding', text: 'pricing' })).toEqual([]);
  });

  it('sorts titles by alphabet rather than code-unit order', () => {
    const mixed = [summary({ id: 'z', title: 'Zebra' }), summary({ id: 'a', title: 'apple' })];
    expect(queryLibrary(mixed, { sort: 'title_asc' }).map((entry) => entry.id)).toEqual(['a', 'z']);
  });

  it('breaks an updatedAt tie deterministically', () => {
    const tied = [
      summary({ id: 'second', title: 'Bravo' }),
      summary({ id: 'first', title: 'Alpha' }),
    ];
    expect(queryLibrary(tied, { sort: 'updated_asc' }).map((entry) => entry.id)).toEqual([
      'first',
      'second',
    ]);
  });

  it('returns an empty list rather than failing when nothing matches', () => {
    expect(queryLibrary(library, { text: 'no such capsule' })).toEqual([]);
  });
});

describe('collectTags', () => {
  it('counts tags and orders by use, then alphabetically', () => {
    expect(collectTags(library)).toEqual([
      { tag: 'coding', count: 2 },
      { tag: 'writing', count: 2 },
      { tag: 'dashboard', count: 1 },
    ]);
  });

  it('returns nothing for an untagged library', () => {
    expect(collectTags([summary({ id: 'a' })])).toEqual([]);
  });
});
