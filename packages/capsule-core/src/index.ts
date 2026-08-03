/**
 * `@context-capsule/capsule-core` — capsule application logic.
 *
 * Everything above storage and below the UI: the repository contract, library queries,
 * lifecycle policy, and context-prompt composition. It depends only on
 * `@context-capsule/capsule-schema` and has no DOM, Chrome, React, or network access
 * (Document 14 §2), so the extension pages, the service worker, and the optional
 * dashboard can all share one implementation of what a capsule *does*.
 */

export {
  REPOSITORY_ERROR_CODES,
  repositoryError,
  toSummary,
  type CapsuleRecord,
  type CapsuleRepository,
  type CapsuleSummary,
  type ListOptions,
  type RepositoryError,
  type RepositoryErrorCode,
  type RepositoryResult,
} from './repository.js';

export { MemoryCapsuleRepository } from './memory-repository.js';

export {
  DEFAULT_LIBRARY_SORT,
  LIBRARY_SORTS,
  collectTags,
  queryLibrary,
  type LibraryQuery,
  type LibrarySort,
} from './library.js';

export {
  UNDO_WINDOW_MS,
  copyTitle,
  duplicateCapsule,
  isUndoAvailable,
  renameCapsule,
  undoTimeRemainingMs,
} from './lifecycle.js';

export {
  PROMPT_MODES,
  PROMPT_TOKEN_BUDGETS,
  composePrompt,
  estimateTokens,
  type ComposePromptOptions,
  type ComposedPrompt,
  type PromptMode,
  type PromptOmission,
} from './prompt.js';
