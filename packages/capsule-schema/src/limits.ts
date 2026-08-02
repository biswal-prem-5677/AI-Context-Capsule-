/**
 * Concrete bounds for every capsule field (Document 10 §4.2).
 *
 * Document 10 mandates that counts and lengths are bounded but deliberately left the
 * numbers to implementation. These are those numbers, and they are part of the schema
 * contract: changing one changes which documents import successfully, so a change here
 * requires the Document 10 compatibility review described in Document 14 §4.
 *
 * Bounds exist for two reasons: resource exhaustion defence on untrusted import
 * (Document 11), and keeping a capsule inside a usable prompt budget (Document 10 §7).
 */
export const CAPSULE_LIMITS = {
  /** Maximum accepted import file size (Document 10 §4.2). */
  maxImportBytes: 1_048_576,
  /** Maximum payload accepted by optional 1B cloud sync (Document 10 §4.2). */
  maxCloudPayloadBytes: 262_144,

  title: { min: 1, max: 160 },
  subject: { min: 1, max: 200 },
  goal: { min: 1, max: 2_000 },
  currentState: { min: 1, max: 4_000 },

  /** Applies to decisions, constraints, completed, pendingTasks, openQuestions. */
  stringList: { maxItems: 50, maxItemLength: 500 },

  files: { maxItems: 50, maxPathLength: 400, maxNoteLength: 300 },
  tags: { maxItems: 20, maxTagLength: 40 },

  conversationUrl: { maxLength: 2_048 },
  visibleTurnCount: { min: 0, max: 100_000 },

  excerpt: { maxTurns: 200, maxTurnLength: 8_000, maxTotalLength: 100_000 },

  /**
   * `maxDepth` bounds nesting inside an extension value. Byte size alone is not enough:
   * a few hundred bytes of nested arrays is cheap to write and can overflow the stack
   * of any consumer that walks the structure recursively — a renderer, a diff, or
   * `structuredClone` on the way into IndexedDB. Extensions carry small namespaced
   * metadata, so a shallow ceiling costs nothing legitimate.
   */
  extensions: { maxKeys: 20, maxBytes: 65_536, maxKeyLength: 128, maxDepth: 8 },
} as const;

/**
 * Minimum required content for a capsule to count as a real handoff rather than an
 * empty shell (Document 10 §4.6).
 */
export const MIN_PENDING_TASKS = 1;
