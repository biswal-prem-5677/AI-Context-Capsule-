/**
 * Search, source filter, and sort for the library list (Document 04 §4.3).
 *
 * Presentational: it holds no state and performs no query. `queryLibrary` in
 * `capsule-core` decides what matching means, so the same rules apply to the popup, the
 * options page, and the optional dashboard rather than being re-implemented per surface.
 */

import { LIBRARY_SORTS, type LibrarySort } from '@context-capsule/capsule-core';
import { CAPTURE_PROVIDERS, type CaptureProvider } from '@context-capsule/capsule-schema';
import { type RefObject } from 'react';

import { PROVIDER_LABELS, SORT_LABELS } from '../ui/labels.js';

export interface LibraryToolbarProps {
  readonly text: string;
  readonly onTextChange: (text: string) => void;
  /** `null` is "every source", which is the state the popup opens in. */
  readonly provider: CaptureProvider | null;
  /** Only the sources present in the library. A filter that can only ever return nothing is not a filter. */
  readonly providers: readonly CaptureProvider[];
  readonly onProviderChange: (provider: CaptureProvider | null) => void;
  readonly sort: LibrarySort;
  readonly onSortChange: (sort: LibrarySort) => void;
  /** Held by the popup so that `/` can move focus here (Document 04 §6). */
  readonly searchRef: RefObject<HTMLInputElement | null>;
}

/**
 * The sort control's value arrives from the DOM as a plain string. It is ours, but it
 * still crosses a boundary where the type is lost, and Document 14 §4 says to narrow
 * explicitly rather than assert — an option list edited later fails here instead of
 * reaching `queryLibrary` as an unknown key.
 */
function isLibrarySort(value: string): value is LibrarySort {
  return (LIBRARY_SORTS as readonly string[]).includes(value);
}

export function LibraryToolbar({
  text,
  onTextChange,
  provider,
  providers,
  onProviderChange,
  sort,
  onSortChange,
  searchRef,
}: LibraryToolbarProps) {
  // Canonical order, so the chips do not rearrange themselves as capsules are added.
  const orderedProviders = CAPTURE_PROVIDERS.filter((candidate) => providers.includes(candidate));

  return (
    <div className="toolbar">
      <div className="field">
        <label className="field-label" htmlFor="library-search">
          Search
        </label>
        <input
          id="library-search"
          ref={searchRef}
          className="field-input"
          type="search"
          value={text}
          placeholder="Dashboard handoff"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            onTextChange(event.target.value);
          }}
        />
      </div>

      {/*
        Radios rather than checkboxes: `LibraryQuery` filters by one source at a time, and
        a checkbox that silently deselects its neighbour is a control lying about what it
        does. The group only renders once there is more than one source to choose between.
      */}
      {orderedProviders.length > 1 && (
        <fieldset className="chip-group">
          <legend className="field-label">Source</legend>
          <div className="chip-row">
            <label className="chip">
              <input
                type="radio"
                name="library-provider"
                className="chip-input"
                checked={provider === null}
                onChange={() => {
                  onProviderChange(null);
                }}
              />
              <span className="chip-text">All</span>
            </label>
            {orderedProviders.map((candidate) => (
              <label className="chip" key={candidate}>
                <input
                  type="radio"
                  name="library-provider"
                  className="chip-input"
                  checked={provider === candidate}
                  onChange={() => {
                    onProviderChange(candidate);
                  }}
                />
                <span className="chip-text">{PROVIDER_LABELS[candidate]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="field field-inline">
        <label className="field-label" htmlFor="library-sort">
          Sort
        </label>
        <select
          id="library-sort"
          className="field-input"
          value={sort}
          onChange={(event) => {
            const next = event.target.value;
            if (isLibrarySort(next)) onSortChange(next);
          }}
        >
          {LIBRARY_SORTS.map((candidate) => (
            <option value={candidate} key={candidate}>
              {SORT_LABELS[candidate]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
