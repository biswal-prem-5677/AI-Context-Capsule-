/**
 * Pure operations that produce a new capsule from an existing one or from user input.
 *
 * Clock and ID generation are injected (Document 14 §4) so that core logic is
 * deterministic in tests and so this package stays free of platform APIs.
 */

import { type CapsuleValidationOutcome } from './issues.js';
import { redactConversationUrl, toRfc3339Utc } from './text.js';
import {
  SCHEMA_VERSION,
  type Capsule,
  type CaptureProvider,
  type CapsuleExcerptTurn,
  type CapsuleFileReference,
  type ExcerptStatus,
} from './types.js';
import { validateCapsule } from './validate.js';

export interface CapsuleEnvironment {
  /** Current time. Injected so tests do not depend on the wall clock. */
  readonly now: () => Date;
  /** Fresh capsule identity. Must be a lowercase UUID. */
  readonly newId: () => string;
}

interface RandomUuidSource {
  readonly randomUUID: () => string;
}

/**
 * Locate Web Crypto without importing a Node module or assuming DOM lib types, so the
 * same code runs in the service worker, an extension page, and a test process.
 */
function findRandomUuidSource(): RandomUuidSource | null {
  const candidate = (globalThis as { crypto?: { randomUUID?: unknown } }).crypto;
  if (candidate && typeof candidate.randomUUID === 'function') {
    return candidate as RandomUuidSource;
  }
  return null;
}

/** Default environment for application code. Tests should inject a fixed one instead. */
export const systemCapsuleEnvironment: CapsuleEnvironment = {
  now: () => new Date(),
  newId: () => {
    const source = findRandomUuidSource();
    if (!source) {
      throw new Error('Web Crypto randomUUID is unavailable; supply a CapsuleEnvironment.');
    }
    return source.randomUUID();
  },
};

export interface NewCapsuleSourceInput {
  readonly provider: CaptureProvider;
  readonly conversationUrl?: string;
  /** Defaults to the environment clock. */
  readonly capturedAt?: string;
  /** Defaults to 0 for a manually written capsule. */
  readonly visibleTurnCount?: number;
  /** Defaults to `not_included`. */
  readonly excerptStatus?: ExcerptStatus;
}

export interface NewCapsuleInput {
  readonly title: string;
  readonly subject?: string;
  readonly goal: string;
  readonly currentState: string;
  readonly decisions?: readonly string[];
  readonly constraints?: readonly string[];
  readonly completed?: readonly string[];
  readonly files?: readonly CapsuleFileReference[];
  readonly pendingTasks: readonly string[];
  readonly openQuestions?: readonly string[];
  readonly source: NewCapsuleSourceInput;
  readonly sourceExcerpt?: readonly CapsuleExcerptTurn[] | null;
  readonly tags?: readonly string[];
  readonly extensions?: Readonly<Record<string, unknown>>;
}

/**
 * Build a capsule from user or adapter input.
 *
 * The candidate is routed through {@link validateCapsule}, the same function that
 * guards imported files. Creation and import therefore cannot diverge: anything the
 * importer rejects, the editor also rejects.
 */
export function createCapsule(
  input: NewCapsuleInput,
  environment: CapsuleEnvironment = systemCapsuleEnvironment,
): CapsuleValidationOutcome<Capsule> {
  const timestamp = toRfc3339Utc(environment.now());

  const candidate: Record<string, unknown> = {
    schemaVersion: SCHEMA_VERSION,
    id: environment.newId(),
    title: input.title,
    goal: input.goal,
    currentState: input.currentState,
    decisions: input.decisions ?? [],
    constraints: input.constraints ?? [],
    completed: input.completed ?? [],
    files: input.files ?? [],
    pendingTasks: input.pendingTasks,
    openQuestions: input.openQuestions ?? [],
    source: {
      provider: input.source.provider,
      ...(input.source.conversationUrl === undefined
        ? {}
        : { conversationUrl: input.source.conversationUrl }),
      capturedAt: input.source.capturedAt ?? timestamp,
      visibleTurnCount: input.source.visibleTurnCount ?? 0,
      excerptStatus: input.source.excerptStatus ?? 'not_included',
    },
    sourceExcerpt: input.sourceExcerpt ?? null,
    tags: input.tags ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
    extensions: input.extensions ?? {},
  };

  if (input.subject !== undefined) candidate['subject'] = input.subject;

  return validateCapsule(candidate);
}

/**
 * Stamp a capsule as edited.
 *
 * Clamped so `updatedAt` can never precede `createdAt`. A user with a skewed system
 * clock should not produce a capsule that fails its own validation on re-import.
 */
export function touchCapsule(
  capsule: Capsule,
  environment: CapsuleEnvironment = systemCapsuleEnvironment,
): Capsule {
  const now = environment.now().getTime();
  const created = Date.parse(capsule.createdAt);
  const updatedAt = toRfc3339Utc(new Date(Math.max(now, created)));
  return { ...capsule, updatedAt };
}

/**
 * Strip query strings and fragments from the source URL before the capsule leaves the
 * device (Document 10 §10).
 *
 * Provider conversation URLs can carry share tokens or session identifiers. The origin
 * and path are retained because they let a person recognise which conversation the
 * capsule came from, which is the point of recording the URL at all. A URL that cannot
 * be parsed safely is dropped rather than guessed at.
 *
 * Export, copy, and any future sync path must call this. It is a separate step from
 * serialization so that the change is visible at the call site and testable on its own.
 */
export function redactCapsuleForExport(capsule: Capsule): Capsule {
  const { conversationUrl } = capsule.source;
  if (conversationUrl === undefined) return capsule;

  const redacted = redactConversationUrl(conversationUrl);
  if (redacted === conversationUrl) return capsule;

  if (redacted === null) {
    const { conversationUrl: _dropped, ...source } = capsule.source;
    return { ...capsule, source };
  }
  return { ...capsule, source: { ...capsule.source, conversationUrl: redacted } };
}
