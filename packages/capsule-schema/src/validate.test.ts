import { describe, expect, it } from 'vitest';

import { excerptCapsuleJson, minimalCapsuleJson, validCapsuleJson } from './fixtures/index.js';
import { type CapsuleIssue, type CapsuleIssueCode } from './issues.js';
import { CAPSULE_LIMITS } from './limits.js';
import { UNKNOWN_FIELDS_EXTENSION_KEY, isValidCapsule, validateCapsule } from './validate.js';

const char = (code: number): string => String.fromCharCode(code);

function parseFixture(json: string): Record<string, unknown> {
  return JSON.parse(json) as Record<string, unknown>;
}

/** Minimal valid capsule object, freshly built so tests cannot leak state into each other. */
function base(): Record<string, unknown> {
  return parseFixture(minimalCapsuleJson);
}

function withField(field: string, value: unknown): Record<string, unknown> {
  const object = base();
  object[field] = value;
  return object;
}

function withoutField(field: string): Record<string, unknown> {
  const object = base();
  delete object[field];
  return object;
}

function withSource(patch: Record<string, unknown>): Record<string, unknown> {
  const object = base();
  object['source'] = { ...(object['source'] as Record<string, unknown>), ...patch };
  return object;
}

function codesOf(issues: readonly CapsuleIssue[]): CapsuleIssueCode[] {
  return issues.map((issue) => issue.code);
}

function expectRejected(input: unknown, code: CapsuleIssueCode, path?: string): CapsuleIssue[] {
  const outcome = validateCapsule(input);
  expect(outcome.ok).toBe(false);
  if (outcome.ok) throw new Error('unreachable');
  const matching = outcome.issues.filter(
    (issue) => issue.code === code && (path === undefined || issue.path === path),
  );
  expect(
    matching.length,
    `expected issue ${code}${path === undefined ? '' : ` at ${path}`}, got ${JSON.stringify(outcome.issues)}`,
  ).toBeGreaterThan(0);
  return [...outcome.issues];
}

function expectAccepted(input: unknown): ReturnType<typeof validateCapsule> {
  const outcome = validateCapsule(input);
  expect(outcome.ok, outcome.ok ? '' : `unexpected errors: ${JSON.stringify(outcome.issues)}`).toBe(
    true,
  );
  return outcome;
}

describe('validateCapsule — accepted input', () => {
  it('accepts the minimal fixture', () => {
    expectAccepted(base());
  });

  it('accepts the full fixture with every canonical field populated', () => {
    const outcome = expectAccepted(parseFixture(validCapsuleJson));
    if (!outcome.ok) return;
    expect(outcome.capsule.title).toBe('VisionX dashboard handoff');
    expect(outcome.capsule.files).toHaveLength(1);
    expect(outcome.capsule.tags).toEqual(['coding', 'dashboard']);
    expect(outcome.warnings).toEqual([]);
  });

  it('accepts a capsule carrying a user-selected excerpt', () => {
    const outcome = expectAccepted(parseFixture(excerptCapsuleJson));
    if (!outcome.ok) return;
    expect(outcome.capsule.sourceExcerpt).toHaveLength(2);
    expect(outcome.capsule.source.excerptStatus).toBe('user_selected');
  });

  it('exposes a boolean guard for call sites that do not need issues', () => {
    expect(isValidCapsule(base())).toBe(true);
    expect(isValidCapsule({ schemaVersion: '1.0' })).toBe(false);
  });

  it('does not mutate the input object', () => {
    const input = parseFixture(validCapsuleJson);
    const before = JSON.stringify(input);
    validateCapsule(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('validateCapsule — structure and schema version', () => {
  it.each([
    ['a string', 'just text'],
    ['a number', 42],
    ['null', null],
    ['an array', []],
  ])('rejects %s at the root', (_name, value) => {
    expectRejected(value, 'not_an_object');
  });

  it('requires schemaVersion', () => {
    expectRejected(withoutField('schemaVersion'), 'unsupported_schema_version');
  });

  it('stops at an unsupported major instead of reporting misleading field errors', () => {
    const outcome = validateCapsule({ schemaVersion: '9.0', title: 12345 });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(codesOf(outcome.issues)).toEqual(['unsupported_schema_version']);
  });

  it('warns but accepts a newer minor version', () => {
    const outcome = expectAccepted(withField('schemaVersion', '1.9'));
    if (!outcome.ok) return;
    expect(codesOf(outcome.warnings)).toContain('unsupported_schema_version');
    expect(outcome.capsule.schemaVersion).toBe('1.0');
  });
});

describe('validateCapsule — unknown and unsafe keys', () => {
  it('rejects an unknown root field in strict mode', () => {
    expectRejected(withField('somethingElse', 'value'), 'unknown_field', 'somethingElse');
  });

  it('preserves an unknown root field under extensions in compatibility mode', () => {
    const outcome = validateCapsule(withField('futureField', 'value'), { mode: 'compatibility' });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.capsule.extensions[UNKNOWN_FIELDS_EXTENSION_KEY]).toEqual({
      futureField: 'value',
    });
    expect(codesOf(outcome.warnings)).toContain('unknown_field');
  });

  it('rejects a __proto__ key without polluting Object.prototype', () => {
    const hostile = JSON.parse('{"schemaVersion":"1.0","__proto__":{"polluted":true}}') as Record<
      string,
      unknown
    >;
    expectRejected(hostile, 'unsafe_key');
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('rejects an unsafe key even in compatibility mode', () => {
    const hostile = JSON.parse('{"schemaVersion":"1.0","constructor":{}}') as Record<
      string,
      unknown
    >;
    const outcome = validateCapsule(hostile, { mode: 'compatibility' });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(codesOf(outcome.issues)).toContain('unsafe_key');
  });
});

describe('validateCapsule — required text fields', () => {
  it.each(['title', 'goal', 'currentState'])('requires %s', (field) => {
    expectRejected(withoutField(field), 'missing_field', field);
  });

  it.each(['title', 'goal', 'currentState'])('rejects a whitespace-only %s', (field) => {
    expectRejected(withField(field, '   \n  '), 'empty_value', field);
  });

  it.each(['title', 'goal', 'currentState'])('rejects a non-string %s', (field) => {
    expectRejected(withField(field, 42), 'wrong_type', field);
  });

  it('rejects a title over its character limit', () => {
    expectRejected(
      withField('title', 'x'.repeat(CAPSULE_LIMITS.title.max + 1)),
      'too_long',
      'title',
    );
  });

  it('rejects control characters in text', () => {
    expectRejected(withField('goal', `bad${char(0)}goal`), 'unsafe_text', 'goal');
  });

  it('normalizes line endings, whitespace, and Unicode form', () => {
    const outcome = expectAccepted(
      withField('goal', `  Ship the cafe${char(0x301)} page.${char(0x0d)}\n  `),
    );
    if (!outcome.ok) return;
    expect(outcome.capsule.goal).toBe(`Ship the caf${char(0xe9)} page.`);
  });

  it('treats an empty optional subject as absent rather than invalid', () => {
    const outcome = expectAccepted(withField('subject', '   '));
    if (!outcome.ok) return;
    expect(outcome.capsule.subject).toBeUndefined();
  });
});

describe('validateCapsule — list fields', () => {
  it('requires at least one pending task', () => {
    expectRejected(withField('pendingTasks', []), 'too_few_items', 'pendingTasks');
    expectRejected(withoutField('pendingTasks'), 'too_few_items', 'pendingTasks');
  });

  it('drops empty entries with a warning instead of failing', () => {
    const outcome = expectAccepted(withField('decisions', ['Keep this', '   ', 'And this']));
    if (!outcome.ok) return;
    expect(outcome.capsule.decisions).toEqual(['Keep this', 'And this']);
    expect(codesOf(outcome.warnings)).toContain('empty_value');
  });

  it('rejects rather than silently truncates an over-long list', () => {
    const tooMany = Array.from(
      { length: CAPSULE_LIMITS.stringList.maxItems + 1 },
      (_unused, index) => `item ${String(index)}`,
    );
    expectRejected(withField('constraints', tooMany), 'too_many_items', 'constraints');
  });

  it('rejects an over-long list entry with a path to the entry', () => {
    const long = 'x'.repeat(CAPSULE_LIMITS.stringList.maxItemLength + 1);
    expectRejected(withField('completed', ['fine', long]), 'too_long', 'completed.1');
  });

  it('rejects a non-array list', () => {
    expectRejected(withField('decisions', 'not a list'), 'wrong_type', 'decisions');
  });

  it('defaults an absent optional list to empty', () => {
    const outcome = expectAccepted(withoutField('openQuestions'));
    if (!outcome.ok) return;
    expect(outcome.capsule.openQuestions).toEqual([]);
  });
});

describe('validateCapsule — files and tags', () => {
  it('accepts a file reference with an optional note', () => {
    const outcome = expectAccepted(
      withField('files', [{ path: 'src/app.ts' }, { path: 'src/b.ts', note: 'Here' }]),
    );
    if (!outcome.ok) return;
    expect(outcome.capsule.files).toEqual([
      { path: 'src/app.ts' },
      { path: 'src/b.ts', note: 'Here' },
    ]);
  });

  it('requires a path on every file reference', () => {
    expectRejected(withField('files', [{ note: 'orphan' }]), 'missing_field', 'files.0.path');
  });

  it('rejects a non-object file entry', () => {
    expectRejected(withField('files', ['src/app.ts']), 'wrong_type', 'files.0');
  });

  it('removes duplicate tags with a warning', () => {
    const outcome = expectAccepted(withField('tags', ['a', 'b', 'a']));
    if (!outcome.ok) return;
    expect(outcome.capsule.tags).toEqual(['a', 'b']);
    expect(outcome.warnings.length).toBeGreaterThan(0);
  });
});

describe('validateCapsule — identity and timestamps', () => {
  it('requires a lowercase UUID id', () => {
    expectRejected(withField('id', 'not-a-uuid'), 'invalid_format', 'id');
    expectRejected(withoutField('id'), 'missing_field', 'id');
  });

  it.each(['createdAt', 'updatedAt'])('requires %s to be RFC3339 UTC', (field) => {
    expectRejected(withField(field, '2026-07-29 00:00:00'), 'invalid_format', field);
  });

  it('rejects updatedAt earlier than createdAt', () => {
    const object = base();
    object['createdAt'] = '2026-07-29T10:00:00.000Z';
    object['updatedAt'] = '2026-07-29T09:00:00.000Z';
    expectRejected(object, 'timestamp_order', 'updatedAt');
  });

  it('accepts equal timestamps', () => {
    expectAccepted(base());
  });
});

describe('validateCapsule — source', () => {
  it('requires source', () => {
    expectRejected(withoutField('source'), 'missing_field', 'source');
  });

  it('rejects an unknown provider', () => {
    expectRejected(withSource({ provider: 'copilot' }), 'invalid_enum', 'source.provider');
  });

  it('rejects an unknown excerpt status', () => {
    expectRejected(withSource({ excerptStatus: 'maybe' }), 'invalid_enum', 'source.excerptStatus');
  });

  it('rejects a non-integer visible turn count', () => {
    expectRejected(withSource({ visibleTurnCount: 1.5 }), 'wrong_type', 'source.visibleTurnCount');
  });

  it('rejects a negative visible turn count', () => {
    expectRejected(withSource({ visibleTurnCount: -1 }), 'out_of_range', 'source.visibleTurnCount');
  });

  it('requires an RFC3339 capturedAt', () => {
    expectRejected(withSource({ capturedAt: 'today' }), 'invalid_format', 'source.capturedAt');
  });

  it.each([
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/html,<script>alert(1)</script>'],
    ['relative', '/c/abc'],
  ])('rejects a %s conversation URL', (_name, url) => {
    expectRejected(withSource({ conversationUrl: url }), 'unsafe_url_scheme');
  });

  it('accepts and preserves an https conversation URL', () => {
    const outcome = expectAccepted(withSource({ conversationUrl: 'https://claude.ai/chat/abc' }));
    if (!outcome.ok) return;
    expect(outcome.capsule.source.conversationUrl).toBe('https://claude.ai/chat/abc');
  });

  it('treats an empty conversation URL as absent', () => {
    const outcome = expectAccepted(withSource({ conversationUrl: '' }));
    if (!outcome.ok) return;
    expect(outcome.capsule.source.conversationUrl).toBeUndefined();
  });
});

describe('validateCapsule — excerpt honesty', () => {
  it('rejects an excerpt present while the status says it is not included', () => {
    const object = parseFixture(excerptCapsuleJson);
    object['source'] = {
      ...(object['source'] as Record<string, unknown>),
      excerptStatus: 'not_included',
    };
    expectRejected(object, 'inconsistent_source', 'source.excerptStatus');
  });

  it('rejects a status claiming an excerpt when none is present', () => {
    expectRejected(
      withSource({ excerptStatus: 'user_selected' }),
      'inconsistent_source',
      'source.excerptStatus',
    );
  });

  it('rejects an excerpt turn with an unknown role', () => {
    const object = parseFixture(excerptCapsuleJson);
    object['sourceExcerpt'] = [{ role: 'system', text: 'hidden prompt' }];
    expectRejected(object, 'invalid_enum', 'sourceExcerpt.0.role');
  });

  it('rejects an over-long excerpt turn', () => {
    const object = parseFixture(excerptCapsuleJson);
    object['sourceExcerpt'] = [
      { role: 'user', text: 'x'.repeat(CAPSULE_LIMITS.excerpt.maxTurnLength + 1) },
    ];
    expectRejected(object, 'too_long', 'sourceExcerpt.0.text');
  });

  it('rejects more excerpt turns than the limit', () => {
    const object = parseFixture(excerptCapsuleJson);
    object['sourceExcerpt'] = Array.from({ length: CAPSULE_LIMITS.excerpt.maxTurns + 1 }, () => ({
      role: 'user',
      text: 'hi',
    }));
    expectRejected(object, 'too_many_items', 'sourceExcerpt');
  });
});

describe('validateCapsule — extensions', () => {
  it('accepts a vendor-prefixed key', () => {
    const outcome = expectAccepted(withField('extensions', { 'x-editor': { cursor: 3 } }));
    if (!outcome.ok) return;
    expect(outcome.capsule.extensions['x-editor']).toEqual({ cursor: 3 });
  });

  it('accepts a reverse-domain key', () => {
    expectAccepted(withField('extensions', { 'com.example.tool': 1 }));
  });

  it('rejects an unnamespaced key', () => {
    expectRejected(
      withField('extensions', { notes: 'x' }),
      'invalid_extension_namespace',
      'extensions.notes',
    );
  });

  it('rejects a key that shadows a canonical field', () => {
    expectRejected(
      withField('extensions', { goal: 'shadow' }),
      'invalid_extension_namespace',
      'extensions.goal',
    );
  });

  it('rejects extensions larger than their byte budget', () => {
    const big = { 'x-big': 'x'.repeat(CAPSULE_LIMITS.extensions.maxBytes) };
    expectRejected(withField('extensions', big), 'payload_too_large', 'extensions');
  });

  it('rejects a non-object extensions value', () => {
    expectRejected(withField('extensions', ['x']), 'wrong_type', 'extensions');
  });

  it('accepts nesting up to the depth limit', () => {
    let nested: unknown = 1;
    for (let level = 1; level < CAPSULE_LIMITS.extensions.maxDepth; level += 1) {
      nested = [nested];
    }
    expectAccepted(withField('extensions', { 'x-nested': nested }));
  });

  it('rejects nesting past the depth limit without overflowing the stack', () => {
    let nested: unknown = 1;
    for (let level = 0; level < 5_000; level += 1) {
      nested = [nested];
    }
    expectRejected(withField('extensions', { 'x-deep': nested }), 'too_long', 'extensions.x-deep');
  });
});

describe('validateCapsule — failure drafts', () => {
  it('returns the fields it could recover so the user can repair the import', () => {
    const object = base();
    delete object['goal'];
    object['title'] = '  Recoverable title  ';

    const outcome = validateCapsule(object);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;

    expect(outcome.draft.title).toBe('Recoverable title');
    expect(outcome.draft.goal).toBeUndefined();
    expect(outcome.draft.pendingTasks).toEqual(['Pick an approach']);
  });

  it('reports every independent problem in one pass rather than one at a time', () => {
    const object = base();
    delete object['goal'];
    delete object['currentState'];
    object['id'] = 'bad';

    const outcome = validateCapsule(object);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.issues.length).toBeGreaterThanOrEqual(3);
  });
});
