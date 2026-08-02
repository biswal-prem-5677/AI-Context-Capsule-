import { describe, expect, it } from 'vitest';

import { validCapsuleJson } from './fixtures/index.js';
import { parseCapsuleJson } from './json-codec.js';
import {
  createCapsule,
  redactCapsuleForExport,
  systemCapsuleEnvironment,
  touchCapsule,
  type CapsuleEnvironment,
  type NewCapsuleInput,
} from './operations.js';
import { type Capsule } from './types.js';

const FIXED_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

function fixedEnvironment(iso: string): CapsuleEnvironment {
  return {
    now: () => new Date(iso),
    newId: () => FIXED_ID,
  };
}

const environment = fixedEnvironment('2026-08-02T12:00:00.000Z');

function validInput(overrides: Partial<NewCapsuleInput> = {}): NewCapsuleInput {
  return {
    title: 'Handoff',
    goal: 'Finish the export flow.',
    currentState: 'Codec is written; UI is not.',
    pendingTasks: ['Wire the download button'],
    source: { provider: 'manual' },
    ...overrides,
  };
}

function loadFixtureCapsule(): Capsule {
  const outcome = parseCapsuleJson(validCapsuleJson);
  if (!outcome.ok) throw new Error(`fixture is invalid: ${JSON.stringify(outcome.issues)}`);
  return outcome.capsule;
}

describe('createCapsule', () => {
  it('produces a valid capsule from minimal input', () => {
    const outcome = createCapsule(validInput(), environment);
    expect(outcome.ok, outcome.ok ? '' : JSON.stringify(outcome.issues)).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.capsule.id).toBe(FIXED_ID);
    expect(outcome.capsule.schemaVersion).toBe('1.0');
    expect(outcome.capsule.createdAt).toBe('2026-08-02T12:00:00.000Z');
    expect(outcome.capsule.updatedAt).toBe('2026-08-02T12:00:00.000Z');
    expect(outcome.capsule.source.capturedAt).toBe('2026-08-02T12:00:00.000Z');
    expect(outcome.capsule.source.visibleTurnCount).toBe(0);
    expect(outcome.capsule.source.excerptStatus).toBe('not_included');
    expect(outcome.capsule.sourceExcerpt).toBeNull();
  });

  it('defaults every optional list to empty', () => {
    const outcome = createCapsule(validInput(), environment);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.capsule.decisions).toEqual([]);
    expect(outcome.capsule.constraints).toEqual([]);
    expect(outcome.capsule.completed).toEqual([]);
    expect(outcome.capsule.openQuestions).toEqual([]);
    expect(outcome.capsule.files).toEqual([]);
    expect(outcome.capsule.tags).toEqual([]);
    expect(outcome.capsule.extensions).toEqual({});
  });

  it('omits subject when it is not supplied', () => {
    const outcome = createCapsule(validInput(), environment);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.capsule.subject).toBeUndefined();
  });

  it('applies the same rules as import: an empty pending task list is rejected', () => {
    const outcome = createCapsule(validInput({ pendingTasks: [] }), environment);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.issues.some((issue) => issue.code === 'too_few_items')).toBe(true);
  });

  it('applies the same rules as import: an unsafe URL is rejected', () => {
    const outcome = createCapsule(
      validInput({ source: { provider: 'manual', conversationUrl: 'javascript:alert(1)' } }),
      environment,
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.issues.some((issue) => issue.code === 'unsafe_url_scheme')).toBe(true);
  });

  it('normalizes text on creation, not only on import', () => {
    const outcome = createCapsule(validInput({ title: '  Spaced out  ' }), environment);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.capsule.title).toBe('Spaced out');
  });

  it('rejects an excerpt whose declared status is inconsistent', () => {
    const outcome = createCapsule(
      validInput({
        source: { provider: 'claude', excerptStatus: 'user_selected' },
        sourceExcerpt: null,
      }),
      environment,
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.issues.some((issue) => issue.code === 'inconsistent_source')).toBe(true);
  });
});

describe('touchCapsule', () => {
  it('advances updatedAt and leaves createdAt alone', () => {
    const capsule = loadFixtureCapsule();
    const touched = touchCapsule(capsule, fixedEnvironment('2026-08-02T12:00:00.000Z'));
    expect(touched.updatedAt).toBe('2026-08-02T12:00:00.000Z');
    expect(touched.createdAt).toBe(capsule.createdAt);
  });

  it('clamps a backwards clock so the capsule cannot fail its own validation', () => {
    const capsule = loadFixtureCapsule();
    const touched = touchCapsule(capsule, fixedEnvironment('2020-01-01T00:00:00.000Z'));
    expect(touched.updatedAt).toBe(capsule.createdAt);

    const reparsed = parseCapsuleJson(JSON.stringify(touched));
    expect(reparsed.ok).toBe(true);
  });

  it('does not mutate the original capsule', () => {
    const capsule = loadFixtureCapsule();
    const before = JSON.stringify(capsule);
    touchCapsule(capsule, fixedEnvironment('2026-08-02T12:00:00.000Z'));
    expect(JSON.stringify(capsule)).toBe(before);
  });
});

describe('redactCapsuleForExport', () => {
  it('strips query strings and fragments from the source URL', () => {
    const capsule = loadFixtureCapsule();
    const withToken: Capsule = {
      ...capsule,
      source: { ...capsule.source, conversationUrl: 'https://chatgpt.com/c/abc?share=secret#top' },
    };

    const redacted = redactCapsuleForExport(withToken);
    expect(redacted.source.conversationUrl).toBe('https://chatgpt.com/c/abc');
  });

  it('returns the same capsule when there is nothing to redact', () => {
    const capsule = loadFixtureCapsule();
    expect(redactCapsuleForExport(capsule)).toBe(capsule);
  });

  it('returns the same capsule when no URL is recorded', () => {
    const capsule = loadFixtureCapsule();
    const { conversationUrl: _dropped, ...source } = capsule.source;
    const without: Capsule = { ...capsule, source };
    expect(redactCapsuleForExport(without)).toBe(without);
  });

  it('produces a capsule that still validates', () => {
    const capsule = loadFixtureCapsule();
    const withToken: Capsule = {
      ...capsule,
      source: { ...capsule.source, conversationUrl: 'https://chatgpt.com/c/abc?share=secret' },
    };
    const outcome = parseCapsuleJson(JSON.stringify(redactCapsuleForExport(withToken)));
    expect(outcome.ok).toBe(true);
  });

  it('does not mutate the original capsule', () => {
    const capsule = loadFixtureCapsule();
    const withToken: Capsule = {
      ...capsule,
      source: { ...capsule.source, conversationUrl: 'https://chatgpt.com/c/abc?share=secret' },
    };
    redactCapsuleForExport(withToken);
    expect(withToken.source.conversationUrl).toBe('https://chatgpt.com/c/abc?share=secret');
  });
});

describe('systemCapsuleEnvironment', () => {
  it('generates a UUID that the validator accepts', () => {
    const outcome = createCapsule(validInput(), systemCapsuleEnvironment);
    expect(outcome.ok, outcome.ok ? '' : JSON.stringify(outcome.issues)).toBe(true);
  });
});
