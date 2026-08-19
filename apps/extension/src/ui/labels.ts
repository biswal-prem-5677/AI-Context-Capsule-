/**
 * User-facing names for values the schema stores as identifiers.
 *
 * `CaptureProvider` and `LibrarySort` are contract values — they are written to disk,
 * exported, and compared. They are not display text, and rendering `'updated_desc'` or
 * capitalising `'chatgpt'` at the point of use would tie the two together, so that
 * renaming a stored value would silently change what a user reads.
 *
 * Both maps are total `Record`s rather than lookups with a fallback. Adding a provider or
 * a sort order then fails typecheck here instead of rendering a raw identifier in the UI.
 */

import { type LibrarySort } from '@context-capsule/capsule-core';
import { type CaptureProvider } from '@context-capsule/capsule-schema';

/**
 * Provider names use each product's own capitalisation because that is what a user is
 * looking for in the list. `manual`, `imported`, and `other` are not products, so they
 * are described by how the capsule got here (Document 10 §3: this records capture source
 * only, and is not a claim of affiliation or of destination support).
 */
export const PROVIDER_LABELS: Readonly<Record<CaptureProvider, string>> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  manual: 'Written by hand',
  imported: 'Imported',
  other: 'Other source',
};

export const SORT_LABELS: Readonly<Record<LibrarySort, string>> = {
  updated_desc: 'Recently updated',
  updated_asc: 'Least recently updated',
  title_asc: 'Title A–Z',
  title_desc: 'Title Z–A',
};
