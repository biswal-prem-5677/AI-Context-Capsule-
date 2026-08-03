/**
 * Context prompt projection (Document 10 §7, Document 02 F-06).
 *
 * A prompt is a *projection* of a capsule, not the capsule itself: it is lossy on
 * purpose, bounded by a token budget, and never written back. That is why it lives here
 * rather than beside the JSON and Markdown codecs, which are representations of the
 * canonical envelope.
 *
 * Three rules the output has to keep:
 *
 * 1. **It says what it is.** The directive tells the receiving model this is
 *    user-prepared context, not a transcript, and that it may be incomplete. Document 02
 *    §8.5 forbids promising to "continue exactly where you left off".
 * 2. **It names what it dropped.** If compact mode cannot fit every decision, the output
 *    says how many were left out. Silence would read as "that is all there was".
 * 3. **It does not carry raw conversation text.** See {@link composePrompt}.
 */

import { type Capsule } from '@context-capsule/capsule-schema';

export const PROMPT_MODES = ['compact', 'full'] as const;
export type PromptMode = (typeof PROMPT_MODES)[number];

/** Target ceilings from Document 02 F-06. Advisory, like the estimate itself. */
export const PROMPT_TOKEN_BUDGETS: Readonly<Record<PromptMode, number>> = {
  compact: 2_500,
  full: 7_000,
};

/**
 * Room held back for the "Not included" block, which cannot be measured until the rest of
 * the prompt is assembled. Overshooting slightly is harmless; the final estimate is
 * reported from the finished text either way.
 */
const OMISSION_ALLOWANCE_TOKENS = 80;

export interface PromptOmission {
  /** Heading as it appears in the prompt, so the UI can point at it. */
  readonly section: string;
  readonly omittedCount: number;
  readonly totalCount: number;
}

export interface ComposedPrompt {
  readonly text: string;
  readonly mode: PromptMode;
  /**
   * Rough token count. Advisory only (Document 02 F-06): this is a character heuristic,
   * not a tokenizer, and every provider counts differently. Shipping a real tokenizer
   * would add a large dependency to be wrong in a different way.
   */
  readonly estimatedTokens: number;
  readonly budgetTokens: number;
  /** Sections that could not be included in full, with counts. Empty when nothing was cut. */
  readonly omissions: readonly PromptOmission[];
  /** True when required content alone exceeds the budget. The text is still complete. */
  readonly overBudget: boolean;
}

/**
 * Estimate tokens from characters.
 *
 * Four characters per token is the common English-text approximation. It is wrong for
 * code and for non-Latin scripts, which is exactly why the result is labelled advisory
 * everywhere it is surfaced.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const DIRECTIVE = [
  'The following is working context a person prepared by hand and chose to share with you.',
  'It is a structured summary of earlier work, not a transcript, and it may be incomplete.',
  'Treat it as background. Where it is silent or ambiguous, ask before assuming.',
].join('\n');

const PROVIDER_LABELS: Readonly<Record<Capsule['source']['provider'], string>> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  manual: 'a manually written capsule',
  imported: 'an imported capsule',
  other: 'another assistant',
};

function renderList(heading: string, items: readonly string[]): string {
  return `## ${heading}\n${items.map((item) => `- ${item}`).join('\n')}`;
}

function renderFiles(capsule: Capsule): string[] {
  return capsule.files.map((file) =>
    file.note === undefined ? file.path : `${file.path} — ${file.note}`,
  );
}

/**
 * Optional sections in the order compact mode gives them up: last entry is dropped first.
 *
 * Constraints outrank decisions because breaking a stated constraint is the more
 * expensive mistake for the receiving model to make; completed work and open questions
 * are the most recoverable to lose, since the user can restate them in their next
 * message.
 */
const OPTIONAL_SECTIONS: readonly {
  readonly heading: string;
  readonly items: (capsule: Capsule) => readonly string[];
}[] = [
  { heading: 'Constraints', items: (capsule) => capsule.constraints },
  { heading: 'Decisions already made', items: (capsule) => capsule.decisions },
  { heading: 'Files and references', items: renderFiles },
  { heading: 'Already completed', items: (capsule) => capsule.completed },
  { heading: 'Open questions', items: (capsule) => capsule.openQuestions },
];

/**
 * Describe where the capsule came from, and state plainly that raw conversation text is
 * not travelling with it.
 */
function renderSource(capsule: Capsule): string {
  const { source } = capsule;
  const lines = [
    `Captured from ${PROVIDER_LABELS[source.provider]} on ${source.capturedAt.slice(0, 10)}.`,
  ];
  if (source.visibleTurnCount > 0) {
    lines.push(
      `${String(source.visibleTurnCount)} conversation turn(s) were visible at capture time.`,
    );
  }
  lines.push(
    source.excerptStatus === 'not_included'
      ? 'No raw conversation text is included.'
      : 'The capsule holds a raw excerpt, which is deliberately not reproduced here.',
  );
  return `## Source\n${lines.join('\n')}`;
}

/** Greatest number of leading items whose rendered section still fits in `remaining`. */
function fitItems(heading: string, items: readonly string[], remaining: number): number {
  let count = items.length;
  while (count > 0 && estimateTokens(renderList(heading, items.slice(0, count))) > remaining) {
    count -= 1;
  }
  return count;
}

export interface ComposePromptOptions {
  readonly mode: PromptMode;
}

/**
 * Render a capsule as a plain-text handoff.
 *
 * **Raw excerpts are never inlined.** A capsule may hold conversation text the user
 * selected, and Document 10 §7 lists the fields a projection carries — the excerpt is not
 * among them. The prompt discloses that an excerpt exists and leaves it in the capsule,
 * so moving a capsule between providers never silently ships raw conversation text to a
 * third party the user did not choose to send it to.
 *
 * **The destination draft is not this function's concern.** Document 10 §7 puts existing
 * composer text after a `--- User draft ---` divider; that is the insertion step's job in
 * the adapter layer (Milestone 2), and doing it here would mean core had to know about a
 * host page.
 *
 * Compact mode drops optional list entries from the end of {@link OPTIONAL_SECTIONS}
 * until the budget is met, and reports every cut. Required content — goal, current state,
 * and at least one next action — is never dropped; if it alone exceeds the budget the
 * result is marked `overBudget` rather than quietly truncated.
 */
export function composePrompt(capsule: Capsule, options: ComposePromptOptions): ComposedPrompt {
  const { mode } = options;
  const budget = PROMPT_TOKEN_BUDGETS[mode];
  const omissions: PromptOmission[] = [];

  const heading =
    capsule.subject === undefined
      ? `# ${capsule.title}`
      : `# ${capsule.title}\nProject: ${capsule.subject}`;

  const required = [
    DIRECTIVE,
    heading,
    `## Goal\n${capsule.goal}`,
    `## Current state\n${capsule.currentState}`,
  ];

  // Next actions are required, so they are fitted rather than skipped: at least one is
  // always present, and anything cut is reported.
  const nextHeading = 'Next actions';
  const requiredSoFar = estimateTokens(required.join('\n\n'));
  const sourceBlock = renderSource(capsule);
  const reserved = requiredSoFar + estimateTokens(sourceBlock) + OMISSION_ALLOWANCE_TOKENS;

  const nextCount =
    mode === 'full'
      ? capsule.pendingTasks.length
      : Math.max(1, fitItems(nextHeading, capsule.pendingTasks, budget - reserved));
  const nextActions = capsule.pendingTasks.slice(0, nextCount);
  if (nextCount < capsule.pendingTasks.length) {
    omissions.push({
      section: nextHeading,
      omittedCount: capsule.pendingTasks.length - nextCount,
      totalCount: capsule.pendingTasks.length,
    });
  }

  const blocks = [...required, renderList(nextHeading, nextActions)];
  let used = estimateTokens(blocks.join('\n\n')) + estimateTokens(sourceBlock);

  for (const section of OPTIONAL_SECTIONS) {
    const items = section.items(capsule);
    if (items.length === 0) continue;

    const remaining = budget - used - OMISSION_ALLOWANCE_TOKENS;
    const count = mode === 'full' ? items.length : fitItems(section.heading, items, remaining);

    if (count > 0) {
      const rendered = renderList(section.heading, items.slice(0, count));
      blocks.push(rendered);
      used += estimateTokens(rendered);
    }
    if (count < items.length) {
      omissions.push({
        section: section.heading,
        omittedCount: items.length - count,
        totalCount: items.length,
      });
    }
  }

  blocks.push(sourceBlock);

  if (omissions.length > 0) {
    const lines = omissions.map(
      (omission) =>
        `- ${omission.section}: ${String(omission.totalCount - omission.omittedCount)} of ${String(omission.totalCount)} shown.`,
    );
    blocks.push(
      `## Not included\nThis handoff was shortened to fit. The capsule itself still holds everything below.\n${lines.join('\n')}`,
    );
  }

  const text = `${blocks.join('\n\n')}\n`;
  const estimatedTokens = estimateTokens(text);

  return {
    text,
    mode,
    estimatedTokens,
    budgetTokens: budget,
    omissions,
    overBudget: estimatedTokens > budget,
  };
}
