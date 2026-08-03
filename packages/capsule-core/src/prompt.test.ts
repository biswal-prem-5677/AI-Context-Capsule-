import { createCapsule, parseCapsuleJson, type Capsule } from '@context-capsule/capsule-schema';
import { excerptCapsuleJson, validCapsuleJson } from '@context-capsule/capsule-schema/fixtures';
import { describe, expect, it } from 'vitest';

import { PROMPT_TOKEN_BUDGETS, composePrompt, estimateTokens } from './prompt.js';

function fixture(json: string): Capsule {
  const outcome = parseCapsuleJson(json);
  if (!outcome.ok) throw new Error('fixture did not validate');
  return outcome.capsule;
}

/** A capsule big enough that compact mode has to leave things out. */
function crowdedCapsule(): Capsule {
  const outcome = createCapsule(
    {
      title: 'Crowded handoff',
      goal: 'Ship the release.',
      currentState: 'Most of it works.',
      decisions: Array.from({ length: 50 }, (_, index) => `Decision ${String(index)} `.repeat(30)),
      constraints: Array.from({ length: 50 }, (_, index) =>
        `Constraint ${String(index)} `.repeat(30),
      ),
      completed: Array.from({ length: 50 }, (_, index) => `Completed ${String(index)} `.repeat(30)),
      openQuestions: Array.from({ length: 50 }, (_, index) =>
        `Question ${String(index)} `.repeat(30),
      ),
      pendingTasks: Array.from({ length: 50 }, (_, index) => `Task ${String(index)} `.repeat(30)),
      source: { provider: 'manual' },
    },
    {
      now: () => new Date('2026-08-03T12:00:00.000Z'),
      newId: () => '11111111-2222-4333-8444-555555555555',
    },
  );
  if (!outcome.ok) throw new Error(`crowded fixture invalid: ${JSON.stringify(outcome.issues)}`);
  return outcome.capsule;
}

describe('composePrompt', () => {
  it('opens by saying what the text is and is not', () => {
    const { text } = composePrompt(fixture(validCapsuleJson), { mode: 'full' });
    expect(text).toContain('not a transcript');
    expect(text).toContain('may be incomplete');
    // Document 02 §8.5 forbids promising perfect continuity.
    expect(text.toLowerCase()).not.toContain('continue exactly where you left off');
  });

  it('carries the canonical sections in Document 10 §7 order', () => {
    const { text } = composePrompt(fixture(validCapsuleJson), { mode: 'full' });
    const order = [
      '## Goal',
      '## Current state',
      '## Next actions',
      '## Constraints',
      '## Decisions already made',
      '## Files and references',
      '## Source',
    ];
    const positions = order.map((heading) => text.indexOf(heading));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((left, right) => left - right)).toEqual(positions);
  });

  it('includes the capsule content a receiving model needs', () => {
    const capsule = fixture(validCapsuleJson);
    const { text } = composePrompt(capsule, { mode: 'full' });
    expect(text).toContain(capsule.goal);
    expect(text).toContain(capsule.currentState);
    expect(text).toContain('Build authenticated dashboard UI');
    expect(text).toContain('Do not change routing.');
    expect(text).toContain('src/pages/Dashboard.tsx — Current work area');
  });

  it('reports no omissions when everything fits', () => {
    const result = composePrompt(fixture(validCapsuleJson), { mode: 'compact' });
    expect(result.omissions).toEqual([]);
    expect(result.text).not.toContain('## Not included');
    expect(result.overBudget).toBe(false);
  });

  it('never inlines a raw excerpt, and says so', () => {
    const capsule = fixture(excerptCapsuleJson);
    const { text } = composePrompt(capsule, { mode: 'full' });
    const excerptText = capsule.sourceExcerpt?.[0]?.text ?? '';
    expect(excerptText).not.toBe('');
    expect(text).not.toContain(excerptText);
    expect(text).toContain('deliberately not reproduced here');
  });

  it('states plainly when no raw conversation text travelled', () => {
    expect(composePrompt(fixture(validCapsuleJson), { mode: 'full' }).text).toContain(
      'No raw conversation text is included.',
    );
  });

  it('leaves the destination draft divider to the insertion step', () => {
    // Document 10 §7 puts an existing composer draft after this divider; that is the
    // adapter's job in Milestone 2, not the composer's.
    expect(composePrompt(fixture(validCapsuleJson), { mode: 'full' }).text).not.toContain(
      '--- User draft ---',
    );
  });
});

describe('compact mode', () => {
  it('stays within the compact budget on a capsule that cannot fit', () => {
    const result = composePrompt(crowdedCapsule(), { mode: 'compact' });
    expect(result.estimatedTokens).toBeLessThanOrEqual(PROMPT_TOKEN_BUDGETS.compact);
    expect(result.overBudget).toBe(false);
  });

  it('names every section it shortened, with counts', () => {
    const result = composePrompt(crowdedCapsule(), { mode: 'compact' });
    expect(result.omissions.length).toBeGreaterThan(0);
    expect(result.text).toContain('## Not included');
    for (const omission of result.omissions) {
      expect(result.text).toContain(
        `${omission.section}: ${String(omission.totalCount - omission.omittedCount)} of ${String(omission.totalCount)} shown.`,
      );
    }
  });

  it('keeps at least one next action even under pressure', () => {
    const result = composePrompt(crowdedCapsule(), { mode: 'compact' });
    expect(result.text).toContain('## Next actions');
    expect(result.text).toContain('Task 0');
  });

  it('gives up recoverable sections before constraints', () => {
    const result = composePrompt(crowdedCapsule(), { mode: 'compact' });
    const dropped = new Map(result.omissions.map((entry) => [entry.section, entry.omittedCount]));
    const constraintsDropped = dropped.get('Constraints') ?? 0;
    const questionsDropped = dropped.get('Open questions') ?? 0;
    expect(questionsDropped).toBeGreaterThanOrEqual(constraintsDropped);
  });

  it('produces more content in full mode than in compact mode', () => {
    const capsule = crowdedCapsule();
    const compact = composePrompt(capsule, { mode: 'compact' });
    const full = composePrompt(capsule, { mode: 'full' });
    expect(full.text.length).toBeGreaterThan(compact.text.length);
    expect(full.omissions).toEqual([]);
  });
});

describe('estimateTokens', () => {
  it('is advisory but monotonic in length', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBeGreaterThan(estimateTokens('abcd'));
  });
});
