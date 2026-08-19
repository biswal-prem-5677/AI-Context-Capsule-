/**
 * Loading the capsule library into the popup, as an explicit state machine.
 *
 * There is no fourth state. Document 04 §8 and `EXECUTION_RULES.md` §5.4 both require
 * loading, empty, and failure to be real states rather than the absence of data — a hook
 * that returned `summaries` plus a nullable `error` lets a component render an empty list
 * during the first frame and call it "no capsules yet", which tells a user their library
 * is gone when it is merely still opening.
 */

import { type CapsuleSummary, type RepositoryError } from '@context-capsule/capsule-core';
import { useCallback, useEffect, useState } from 'react';

import { listCapsules } from '../app/library-service.js';

export type LibraryState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly summaries: readonly CapsuleSummary[] }
  | { readonly status: 'error'; readonly error: RepositoryError };

export interface LibraryController {
  readonly state: LibraryState;
  /** Discard the current result and read the library again. Backs the Retry action. */
  readonly reload: () => void;
}

export function useLibrary(): LibraryController {
  const [state, setState] = useState<LibraryState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Guards against a slow first read resolving after a Retry has already started a
    // second one: a stale success would overwrite the newer state and show a list the
    // user has already asked to be refreshed.
    let isCurrent = true;
    setState({ status: 'loading' });

    void listCapsules()
      .then((result) => {
        if (!isCurrent) return;
        setState(
          result.ok
            ? { status: 'ready', summaries: result.value }
            : { status: 'error', error: result.error },
        );
      })
      .catch((cause: unknown) => {
        if (!isCurrent) return;
        // The repository contract is that nothing throws out of a method, so reaching
        // here is a defect rather than a storage condition. It is still handled: a
        // rejected promise with no `catch` would leave the popup loading forever, which
        // is the one outcome with no way out for the user.
        setState({
          status: 'error',
          error: { code: 'unavailable', message: `listCapsules threw: ${String(cause)}` },
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setAttempt((previous) => previous + 1);
  }, []);

  return { state, reload };
}
