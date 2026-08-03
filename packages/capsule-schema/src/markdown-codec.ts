/**
 * Markdown representation of a capsule (Document 10 §6).
 *
 * Markdown is the *readable* interchange form: a person can open it in any text editor,
 * check what a handoff actually says, and paste it somewhere the product does not reach.
 * JSON remains the lossless canonical format (Document 10 §2), and this codec does not
 * pretend otherwise — see {@link parseCapsuleMarkdown} for exactly what a round trip
 * does not preserve.
 *
 * Two rules shape the implementation:
 *
 * 1. **Escaping is reversible.** Capsule text is untrusted (Document 11): a `goal` whose
 *    first line is `## Pending Tasks` must not be able to forge a section when exported
 *    and re-imported. Any line that could be read as structure is prefixed with `\`, and
 *    the parser strips exactly one such prefix.
 * 2. **Nothing is invented.** Parsing produces a candidate object which is handed to
 *    {@link validateCapsule} — the same function that guards JSON import. Markdown import
 *    therefore cannot accept anything JSON import would reject.
 */

import {
  type CapsuleIssue,
  type CapsuleValidationOutcome,
  error,
  warning,
  type CapsuleIssueSeverity,
} from './issues.js';
import { CAPSULE_LIMITS } from './limits.js';
import { systemCapsuleEnvironment, type CapsuleEnvironment } from './operations.js';
import { byteLength, normalizeText, toRfc3339Utc } from './text.js';
import {
  CAPTURE_PROVIDERS,
  EXCERPT_STATUSES,
  SCHEMA_VERSION,
  type Capsule,
  type CaptureProvider,
  type ExcerptRole,
  type ExcerptStatus,
} from './types.js';
import { validateCapsule, type ValidateOptions } from './validate.js';

/** Extension namespace holding `##` sections this build did not recognise. */
export const MARKDOWN_SECTIONS_EXTENSION_KEY = 'x-markdown-sections';

/** Placeholder written for an empty optional list, so a reader sees intent, not a gap. */
const EMPTY_LIST_PLACEHOLDER = 'None recorded.';

const TITLE_PREFIX = 'Context Capsule:';

/** Display labels for the capture provider. Parsed back case-insensitively. */
const PROVIDER_LABELS: Readonly<Record<CaptureProvider, string>> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  manual: 'Manual',
  imported: 'Imported',
  other: 'Other',
};

/**
 * Excerpt disclosure wording. Document 10 §5 requires an excerpt to be clearly marked in
 * exports, so this line is always written even when there is nothing to disclose.
 */
const EXCERPT_LABELS: Readonly<Record<ExcerptStatus, string>> = {
  not_included: 'Not included',
  user_selected: 'Included — selected by the user',
  truncated: 'Included — truncated',
  manual_summary: 'Manual summary',
};

const EXCERPT_ROLE_LABELS: Readonly<Record<ExcerptRole, string>> = {
  user: 'User',
  assistant: 'Assistant',
};

/**
 * Canonical heading for each field, plus the aliases the parser also accepts.
 *
 * Aliases exist because Document 10 §6 promises recognition of "the stable headings and
 * list conventions"; a capsule hand-written by a user who typed `## Decisions` should not
 * be silently discarded when the intent is unambiguous.
 */
interface SectionDefinition {
  readonly heading: string;
  readonly aliases: readonly string[];
}

const SECTIONS = {
  goal: { heading: 'Goal', aliases: [] },
  currentState: { heading: 'Current State', aliases: ['State'] },
  decisions: { heading: 'Important Decisions', aliases: ['Decisions'] },
  constraints: { heading: 'Constraints', aliases: [] },
  completed: { heading: 'Completed', aliases: ['Completed Work'] },
  files: { heading: 'Files and References', aliases: ['Files', 'References'] },
  pendingTasks: { heading: 'Pending Tasks', aliases: ['Next Actions', 'Next Steps'] },
  openQuestions: { heading: 'Open Questions', aliases: ['Questions'] },
  sourceExcerpt: { heading: 'Source Excerpt', aliases: ['Excerpt'] },
} as const satisfies Record<string, SectionDefinition>;

type SectionKey = keyof typeof SECTIONS;

/** Lower-cased heading (and alias) → section key. Built once. */
const SECTION_LOOKUP: ReadonlyMap<string, SectionKey> = new Map(
  (Object.keys(SECTIONS) as SectionKey[]).flatMap((key) => {
    const definition: SectionDefinition = SECTIONS[key];
    return [definition.heading, ...definition.aliases].map(
      (name) => [name.toLowerCase(), key] as const,
    );
  }),
);

const HEADER_KEYS = {
  schemaVersion: 'Schema Version',
  subject: 'Subject',
  source: 'Source',
  sourceUrl: 'Source URL',
  visibleTurns: 'Visible Turns',
  sourceExcerpt: 'Source Excerpt',
  tags: 'Tags',
} as const;

// --- Escaping -------------------------------------------------------------------------

/** Characters that begin a Markdown construct this codec's parser reads as structure. */
const STRUCTURAL_LINE_START = /^[#\-*>\\]/;

/**
 * Escape one line of capsule text.
 *
 * `escapeBlankLine` is set only for list items, where a blank line would otherwise end
 * the list. Text blocks keep real blank lines because paragraph breaks are the whole
 * point of a readable export and no ambiguity exists there.
 */
function escapeLine(line: string, escapeBlankLine: boolean): string {
  if (line === '') return escapeBlankLine ? '\\' : '';
  if (STRUCTURAL_LINE_START.test(line) || line === EMPTY_LIST_PLACEHOLDER) return `\\${line}`;
  return line;
}

/** Inverse of {@link escapeLine}. A lone `\` is the escaped form of an empty line. */
function unescapeLine(line: string): string {
  if (line === '\\') return '';
  return line.startsWith('\\') ? line.slice(1) : line;
}

function escapeTextBlock(text: string): string {
  return text
    .split('\n')
    .map((line) => escapeLine(line, false))
    .join('\n');
}

/**
 * Collapse a value onto one line for a single-line header field.
 *
 * `title` permits internal newlines (they are ordinary whitespace under Document 10 §4.4)
 * but the Markdown header has one line per field. Collapsing is visible and predictable;
 * the alternative — writing a multi-line value into a single-line slot — would silently
 * truncate on re-import.
 */
function flattenToLine(value: string): string {
  return value.replace(/\s*\n\s*/g, ' ');
}

function unescapeBlock(lines: readonly string[]): string {
  return lines.map(unescapeLine).join('\n');
}

// --- Serialization --------------------------------------------------------------------

function serializeListItem(item: string): string {
  const [first = '', ...rest] = item.split('\n').map((line) => escapeLine(line, true));
  return [`- ${first}`, ...rest.map((line) => `  ${line}`)].join('\n');
}

function serializeList(heading: string, items: readonly string[]): string {
  const body =
    items.length === 0 ? `- ${EMPTY_LIST_PLACEHOLDER}` : items.map(serializeListItem).join('\n');
  return `## ${heading}\n\n${body}\n`;
}

function serializeTextSection(heading: string, value: string): string {
  return `## ${heading}\n\n${escapeTextBlock(value)}\n`;
}

/**
 * A file path is wrapped in backticks so it survives copy-paste as literal text. A path
 * that already contains a backtick is written bare instead — wrapping it would produce
 * Markdown that no longer round-trips.
 */
function serializeFileReference(path: string, note: string | undefined): string {
  const rendered = path.includes('`') ? path : `\`${path}\``;
  return serializeListItem(note === undefined ? rendered : `${rendered} — ${note}`);
}

/**
 * Render a capsule as Markdown (Document 10 §6).
 *
 * The header carries the metadata a reader needs to judge the handoff — schema version,
 * where it came from, how much of the conversation was visible, and whether raw excerpt
 * text is present. It deliberately omits `id`, `createdAt`, and `updatedAt`: see
 * {@link parseCapsuleMarkdown}.
 */
export function serializeCapsuleMarkdown(capsule: Capsule): string {
  const { source } = capsule;
  const parts: string[] = [];

  parts.push(`# ${TITLE_PREFIX} ${escapeLine(flattenToLine(capsule.title), false)}\n`);

  const header: string[] = [`${HEADER_KEYS.schemaVersion}: ${capsule.schemaVersion}`];
  if (capsule.subject !== undefined) {
    header.push(`${HEADER_KEYS.subject}: ${flattenToLine(capsule.subject)}`);
  }
  header.push(
    `${HEADER_KEYS.source}: ${PROVIDER_LABELS[source.provider]}; captured ${source.capturedAt}`,
  );
  if (source.conversationUrl !== undefined) {
    header.push(`${HEADER_KEYS.sourceUrl}: ${source.conversationUrl}`);
  }
  header.push(`${HEADER_KEYS.visibleTurns}: ${String(source.visibleTurnCount)}`);
  header.push(`${HEADER_KEYS.sourceExcerpt}: ${EXCERPT_LABELS[source.excerptStatus]}`);
  if (capsule.tags.length > 0) {
    header.push(`${HEADER_KEYS.tags}: ${capsule.tags.join(', ')}`);
  }
  parts.push(`${header.join('\n')}\n`);

  parts.push(serializeTextSection(SECTIONS.goal.heading, capsule.goal));
  parts.push(serializeTextSection(SECTIONS.currentState.heading, capsule.currentState));
  parts.push(serializeList(SECTIONS.decisions.heading, capsule.decisions));
  parts.push(serializeList(SECTIONS.constraints.heading, capsule.constraints));
  parts.push(serializeList(SECTIONS.completed.heading, capsule.completed));

  const files =
    capsule.files.length === 0
      ? `- ${EMPTY_LIST_PLACEHOLDER}`
      : capsule.files.map((file) => serializeFileReference(file.path, file.note)).join('\n');
  parts.push(`## ${SECTIONS.files.heading}\n\n${files}\n`);

  parts.push(serializeList(SECTIONS.pendingTasks.heading, capsule.pendingTasks));
  parts.push(serializeList(SECTIONS.openQuestions.heading, capsule.openQuestions));

  if (capsule.sourceExcerpt !== null && capsule.sourceExcerpt.length > 0) {
    const turns = capsule.sourceExcerpt
      .map((turn) => `**${EXCERPT_ROLE_LABELS[turn.role]}:**\n\n${escapeTextBlock(turn.text)}`)
      .join('\n\n');
    parts.push(`## ${SECTIONS.sourceExcerpt.heading}\n\n${turns}\n`);
  }

  return `${parts.join('\n')}`;
}

// --- Parsing --------------------------------------------------------------------------

export interface ParseCapsuleMarkdownOptions extends ValidateOptions {
  /** Overrides the default 1 MB import ceiling. */
  readonly maxBytes?: number;
  /** Clock and ID factory. Injected so tests do not depend on the wall clock. */
  readonly environment?: CapsuleEnvironment;
}

interface ParsedSection {
  readonly key: SectionKey | null;
  /** Heading exactly as written, used for the unknown-section report. */
  readonly heading: string;
  readonly lines: readonly string[];
}

/** Split the document into its header block and its `##` sections. */
function splitSections(text: string): { header: string[]; sections: ParsedSection[] } {
  const header: string[] = [];
  const sections: ParsedSection[] = [];
  let current: { key: SectionKey | null; heading: string; lines: string[] } | null = null;

  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const match = /^##\s+(.*)$/.exec(line);
    if (match) {
      if (current) sections.push(current);
      const heading = (match[1] ?? '').trim();
      current = { key: SECTION_LOOKUP.get(heading.toLowerCase()) ?? null, heading, lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
    else header.push(line);
  }
  if (current) sections.push(current);
  return { header, sections };
}

function readHeaderFields(lines: readonly string[]): {
  title: string | undefined;
  fields: ReadonlyMap<string, string>;
} {
  let title: string | undefined;
  const fields = new Map<string, string>();

  for (const line of lines) {
    const headingMatch = /^#\s+(.*)$/.exec(line);
    if (headingMatch && title === undefined) {
      const raw = (headingMatch[1] ?? '').trim();
      title = raw.toLowerCase().startsWith(TITLE_PREFIX.toLowerCase())
        ? raw.slice(TITLE_PREFIX.length).trim()
        : raw;
      title = unescapeLine(title);
      continue;
    }
    const fieldMatch = /^([A-Za-z][A-Za-z ]*):\s*(.*)$/.exec(line);
    if (fieldMatch) {
      const key = (fieldMatch[1] ?? '').trim().toLowerCase();
      // First occurrence wins, matching the section rule below.
      if (!fields.has(key)) fields.set(key, (fieldMatch[2] ?? '').trim());
    }
  }
  return { title, fields };
}

/** Collect `- item` entries, folding two-space continuation lines into the same item. */
function readListItems(lines: readonly string[]): string[] {
  const items: string[][] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    const itemMatch = /^-\s(.*)$/.exec(line);
    if (itemMatch) {
      current = [itemMatch[1] ?? ''];
      items.push(current);
      continue;
    }
    if (current !== null && line.startsWith('  ')) {
      current.push(line.slice(2));
      continue;
    }
    if (line.trim() === '') current = null;
  }

  // The placeholder is recognised *before* unescaping. A genuine item whose text happens
  // to be "None recorded." is written escaped, so it survives this check and round-trips.
  const first = items[0];
  if (items.length === 1 && first?.length === 1 && first[0] === EMPTY_LIST_PLACEHOLDER) return [];

  return items.map((lineGroup) => unescapeBlock(lineGroup));
}

function readTextBlock(lines: readonly string[]): string {
  return normalizeText(unescapeBlock(lines));
}

function readFileReferences(lines: readonly string[]): { path: string; note?: string }[] {
  return readListItems(lines).map((item) => {
    const quoted = /^`([^`]*)`(?:\s+—\s+([\s\S]*))?$/.exec(item);
    if (quoted) {
      const path = quoted[1] ?? '';
      const note = quoted[2]?.trim();
      return note === undefined || note === '' ? { path } : { path, note };
    }
    const separator = item.indexOf(' — ');
    if (separator === -1) return { path: item };
    return { path: item.slice(0, separator).trim(), note: item.slice(separator + 3).trim() };
  });
}

function readExcerptTurns(lines: readonly string[]): { role: ExcerptRole; text: string }[] {
  const turns: { role: ExcerptRole; lines: string[] }[] = [];
  let current: { role: ExcerptRole; lines: string[] } | null = null;

  for (const line of lines) {
    const match = /^\*\*(User|Assistant):\*\*\s*$/i.exec(line);
    if (match) {
      const role: ExcerptRole = (match[1] ?? '').toLowerCase() === 'user' ? 'user' : 'assistant';
      current = { role, lines: [] };
      turns.push(current);
      continue;
    }
    if (current) current.lines.push(line);
  }

  return turns.map((turn) => ({ role: turn.role, text: normalizeText(unescapeBlock(turn.lines)) }));
}

function readProviderAndCapturedAt(value: string | undefined): {
  provider: CaptureProvider | undefined;
  capturedAt: string | undefined;
} {
  if (value === undefined) return { provider: undefined, capturedAt: undefined };

  const [providerPart = '', ...rest] = value.split(';');
  const providerName = providerPart.trim().toLowerCase();
  const provider = CAPTURE_PROVIDERS.find(
    (candidate) =>
      candidate === providerName || PROVIDER_LABELS[candidate].toLowerCase() === providerName,
  );

  const capturedMatch = /captured\s+(\S+)/i.exec(rest.join(';'));
  return { provider, capturedAt: capturedMatch?.[1] };
}

function readExcerptStatus(value: string | undefined): ExcerptStatus | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  return EXCERPT_STATUSES.find(
    (status) => status === normalized || EXCERPT_LABELS[status].toLowerCase() === normalized,
  );
}

function issue(
  severity: CapsuleIssueSeverity,
  code: 'unknown_section' | 'ambiguous_section',
  path: string,
  message: string,
): CapsuleIssue {
  return severity === 'error' ? error(code, path, message) : warning(code, path, message);
}

/**
 * Parse untrusted capsule Markdown.
 *
 * **What a Markdown round trip does not preserve.** Document 10 §2 makes JSON the lossless
 * format; these are the specific gaps, all of them visible in the file rather than silent:
 *
 * - **Identity and timestamps.** Markdown carries no `id`, `createdAt`, or `updatedAt`, so
 *   the parser mints them from the injected environment. Re-importing a Markdown export
 *   produces a *new* capsule rather than restoring the original — which is also the safe
 *   behaviour Document 10 §11 requires when an import would otherwise reuse an identity.
 * - **Newlines in `title` and `subject`.** Both are single-line header fields, so an
 *   internal newline is collapsed to a space on export.
 * - **Commas inside a tag.** Tags are written as one comma-separated header line, so a tag
 *   containing a comma re-imports as two tags.
 *
 * Unknown `##` sections are preserved under `extensions.x-markdown-sections` with a
 * warning rather than dropped (Document 10 §6). Raw HTML is never interpreted: every
 * value is read as text and validated like any other untrusted string.
 */
export function parseCapsuleMarkdown(
  text: string,
  options: ParseCapsuleMarkdownOptions = {},
): CapsuleValidationOutcome<Capsule> {
  const maxBytes = options.maxBytes ?? CAPSULE_LIMITS.maxImportBytes;
  const environment = options.environment ?? systemCapsuleEnvironment;

  const size = byteLength(text);
  if (size > maxBytes) {
    return {
      ok: false,
      issues: [
        error(
          'payload_too_large',
          '',
          `File is ${String(size)} bytes, which exceeds the ${String(maxBytes)} byte limit.`,
        ),
      ],
      draft: {},
    };
  }

  const notes: CapsuleIssue[] = [];
  const { header, sections } = splitSections(text.replace(/\r\n?/g, '\n'));
  const { title, fields } = readHeaderFields(header);

  const claimed = new Map<SectionKey, readonly string[]>();
  const unknownSections: Record<string, string> = {};

  for (const section of sections) {
    if (section.key === null) {
      unknownSections[section.heading] = unescapeBlock(section.lines).trim();
      notes.push(
        issue(
          'warning',
          'unknown_section',
          section.heading,
          `Section "${section.heading}" is not a capsule field; it was kept for review under extensions.`,
        ),
      );
      continue;
    }
    if (claimed.has(section.key)) {
      notes.push(
        issue(
          'warning',
          'ambiguous_section',
          section.heading,
          `Section "${section.heading}" appears more than once; the first one was used.`,
        ),
      );
      continue;
    }
    claimed.set(section.key, section.lines);
  }

  const lines = (key: SectionKey): readonly string[] => claimed.get(key) ?? [];

  const { provider, capturedAt } = readProviderAndCapturedAt(
    fields.get(HEADER_KEYS.source.toLowerCase()),
  );
  const visibleTurnsRaw = fields.get(HEADER_KEYS.visibleTurns.toLowerCase());
  const visibleTurnCount = visibleTurnsRaw === undefined ? 0 : Number.parseInt(visibleTurnsRaw, 10);
  const excerptTurns = readExcerptTurns(lines('sourceExcerpt'));
  const declaredStatus = readExcerptStatus(fields.get(HEADER_KEYS.sourceExcerpt.toLowerCase()));

  const timestamp = toRfc3339Utc(environment.now());
  const tagsRaw = fields.get(HEADER_KEYS.tags.toLowerCase());
  const subject = fields.get(HEADER_KEYS.subject.toLowerCase());

  const extensions: Record<string, unknown> =
    Object.keys(unknownSections).length === 0
      ? {}
      : { [MARKDOWN_SECTIONS_EXTENSION_KEY]: unknownSections };

  const conversationUrl = fields.get(HEADER_KEYS.sourceUrl.toLowerCase());

  const source: Record<string, unknown> = {
    // An unrecognised or absent provider becomes `imported`, which is exactly what this
    // capsule is. Guessing a provider would put a false claim in the source record.
    provider: provider ?? 'imported',
    capturedAt: capturedAt ?? timestamp,
    visibleTurnCount: Number.isFinite(visibleTurnCount) ? visibleTurnCount : 0,
    excerptStatus: declaredStatus ?? (excerptTurns.length > 0 ? 'user_selected' : 'not_included'),
  };
  if (conversationUrl !== undefined && conversationUrl !== '') {
    source['conversationUrl'] = conversationUrl;
  }

  const candidate: Record<string, unknown> = {
    schemaVersion: SCHEMA_VERSION,
    id: environment.newId(),
    title: title ?? '',
    goal: readTextBlock(lines('goal')),
    currentState: readTextBlock(lines('currentState')),
    decisions: readListItems(lines('decisions')),
    constraints: readListItems(lines('constraints')),
    completed: readListItems(lines('completed')),
    files: readFileReferences(lines('files')),
    pendingTasks: readListItems(lines('pendingTasks')),
    openQuestions: readListItems(lines('openQuestions')),
    source,
    sourceExcerpt: excerptTurns.length === 0 ? null : excerptTurns,
    tags:
      tagsRaw === undefined || tagsRaw === ''
        ? []
        : tagsRaw
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag !== ''),
    createdAt: timestamp,
    updatedAt: timestamp,
    extensions,
  };

  if (subject !== undefined && subject !== '') candidate['subject'] = subject;

  const outcome = validateCapsule(candidate, options);
  return outcome.ok
    ? { ok: true, capsule: outcome.capsule, warnings: [...notes, ...outcome.warnings] }
    : { ok: false, issues: [...notes, ...outcome.issues], draft: outcome.draft };
}
