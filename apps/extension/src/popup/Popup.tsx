/**
 * The main popup application container (Document 04 §4.3, Document 05 §4).
 *
 * Combines the header branding, search/sort library toolbar, capsule list, and
 * status panel state machine (loading, empty, search empty, and error).
 *
 * Implements keyboard shortcut '/' to focus search input (Document 04 §6).
 */

import { queryLibrary, type LibraryQuery, type LibrarySort } from '@context-capsule/capsule-core';
import { type CaptureProvider } from '@context-capsule/capsule-schema';
import { useEffect, useMemo, useRef, useState } from 'react';

import { describeRepositoryError } from '../app/messages.js';
import { CapsuleList } from './CapsuleList.js';
import { LibraryToolbar } from './LibraryToolbar.js';
import { StatusPanel } from './StatusPanel.js';
import { useLibrary } from './use-library.js';

export function Popup() {
  const { state, reload } = useLibrary();
  const [text, setText] = useState('');
  const [provider, setProvider] = useState<CaptureProvider | null>(null);
  const [sort, setSort] = useState<LibrarySort>('updated_desc');
  const [now] = useState(() => new Date());

  const searchRef = useRef<HTMLInputElement | null>(null);

  // Document 04 §6: '/' focuses the search field.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === '/' && document.activeElement !== searchRef.current) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const availableProviders = useMemo(() => {
    if (state.status !== 'ready') return [];
    return Array.from(new Set(state.summaries.map((item) => item.provider)));
  }, [state]);

  const filteredSummaries = useMemo(() => {
    if (state.status !== 'ready') return [];
    const query: LibraryQuery = {
      text,
      sort,
      ...(provider !== null ? { provider } : {}),
    };
    return queryLibrary(state.summaries, query);
  }, [state, text, provider, sort]);

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="popup-brand">
          <h1 className="popup-title">Context Capsule</h1>
          <span className="popup-badge">v0.1.0</span>
        </div>
      </header>

      <main className="popup-main">
        {state.status === 'loading' && (
          <StatusPanel
            tone="neutral"
            title="Opening your library..."
            detail="Checking local capsule storage."
          />
        )}

        {state.status === 'error' &&
          (() => {
            const userError = describeRepositoryError(state.error);
            return (
              <StatusPanel
                tone="danger"
                title={userError.title}
                detail={userError.detail}
                action={
                  userError.recovery === 'retry' ? { label: 'Retry', onClick: reload } : undefined
                }
                announce={true}
              />
            );
          })()}

        {state.status === 'ready' && (
          <>
            {state.summaries.length === 0 ? (
              <StatusPanel
                tone="neutral"
                title="No capsules saved yet."
                detail="Capsules you capture or create locally will appear here."
              />
            ) : (
              <>
                <LibraryToolbar
                  text={text}
                  onTextChange={setText}
                  provider={provider}
                  providers={availableProviders}
                  onProviderChange={setProvider}
                  sort={sort}
                  onSortChange={setSort}
                  searchRef={searchRef}
                />

                {filteredSummaries.length === 0 ? (
                  <StatusPanel
                    tone="neutral"
                    title="No capsules match your search."
                    detail="Try a different term or clear the source filter."
                    announce={true}
                  />
                ) : (
                  <CapsuleList summaries={filteredSummaries} now={now} />
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
