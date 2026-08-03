import {
  CAPSULE_LIMITS,
  parseCapsuleJson,
  type Capsule,
  type CapsuleEnvironment,
} from '@context-capsule/capsule-schema';
import { validCapsuleJson } from '@context-capsule/capsule-schema/fixtures';
import { describe, expect, it } from 'vitest';

import {
  UNDO_WINDOW_MS,
  copyTitle,
  duplicateCapsule,
  isUndoAvailable,
  renameCapsule,
  undoTimeRemainingMs,
} from './lifecycle.js';
import { type CapsuleRecord } from './repository.js';

const environment: CapsuleEnvironment = {
  now: () => new Date('2026-08-03T12:00:00.000Z'),
  newId: () => '11111111-2222-4333-8444-555555555555',
};

function fixture(): Capsule {
  const outcome = parseCapsuleJson(validCapsuleJson);
  if (!outcome.ok) throw new Error('fixture did not validate');
  return outcome.capsule;
}

function record(deletedAt: string | null): CapsuleRecord {
  return { capsule: fixture(), revision: 1, deletedAt };
}

describe('duplicateCapsule', () => {
  it('produces a new identity and creation time, not a second pointer', () => {
    const original = fixture();
    const outcome = duplicateCapsule(original, environment);
    expect(outcome.ok, outcome.ok ? '' : JSON.stringify(outcome.issues)).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.capsule.id).toBe(environment.newId());
    expect(outcome.capsule.id).not.toBe(original.id);
    expect(outcome.capsule.createdAt).toBe('2026-08-03T12:00:00.000Z');
    expect(outcome.capsule.updatedAt).toBe('2026-08-03T12:00:00.000Z');
  });

  it('keeps the content and the original source provenance', () => {
    const original = fixture();
    const outcome = duplicateCapsule(original, environment);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.capsule.goal).toBe(original.goal);
    expect(outcome.capsule.decisions).toEqual(original.decisions);
    expect(outcome.capsule.source).toEqual(original.source);
  });

  it('titles the copy so the two are distinguishable in a list', () => {
    const outcome = duplicateCapsule(fixture(), environment);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.capsule.title).toBe('Copy of VisionX dashboard handoff');
  });
});

describe('copyTitle', () => {
  it('trims visibly rather than producing a title that fails validation', () => {
    const longTitle = 'x'.repeat(CAPSULE_LIMITS.title.max);
    const copied = copyTitle(longTitle);
    expect(copied.length).toBeLessThanOrEqual(CAPSULE_LIMITS.title.max);
    expect(copied.endsWith('…')).toBe(true);
  });

  it('produces a duplicate that still validates at the title limit', () => {
    const original = fixture();
    const atLimit: Capsule = { ...original, title: 'y'.repeat(CAPSULE_LIMITS.title.max) };
    expect(duplicateCapsule(atLimit, environment).ok).toBe(true);
  });
});

describe('renameCapsule', () => {
  it('applies the new title and stamps the edit', () => {
    const outcome = renameCapsule(fixture(), 'Renamed handoff', environment);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.capsule.title).toBe('Renamed handoff');
    expect(outcome.capsule.updatedAt).toBe('2026-08-03T12:00:00.000Z');
    expect(outcome.capsule.id).toBe(fixture().id);
  });

  it('rejects an empty title instead of writing it', () => {
    const outcome = renameCapsule(fixture(), '   ', environment);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.issues.map((issue) => issue.path)).toContain('title');
  });

  it('never lets a skewed clock put updatedAt before createdAt', () => {
    const past: CapsuleEnvironment = {
      ...environment,
      now: () => new Date('2020-01-01T00:00:00Z'),
    };
    const outcome = renameCapsule(fixture(), 'Backdated', past);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(Date.parse(outcome.capsule.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(outcome.capsule.createdAt),
    );
  });
});

describe('undo window', () => {
  const deletedAt = '2026-08-03T12:00:00.000Z';

  it('is unavailable for a capsule that was never deleted', () => {
    expect(isUndoAvailable(record(null), new Date(deletedAt))).toBe(false);
    expect(undoTimeRemainingMs(record(null), new Date(deletedAt))).toBe(0);
  });

  it('stays open for at least the ten seconds Document 02 F-04 requires', () => {
    expect(UNDO_WINDOW_MS).toBeGreaterThanOrEqual(10_000);
    const justInside = new Date(Date.parse(deletedAt) + UNDO_WINDOW_MS - 1);
    expect(isUndoAvailable(record(deletedAt), justInside)).toBe(true);
  });

  it('closes once the window has elapsed', () => {
    const justOutside = new Date(Date.parse(deletedAt) + UNDO_WINDOW_MS);
    expect(isUndoAvailable(record(deletedAt), justOutside)).toBe(false);
    expect(undoTimeRemainingMs(record(deletedAt), justOutside)).toBe(0);
  });

  it('counts down rather than going negative', () => {
    const halfway = new Date(Date.parse(deletedAt) + UNDO_WINDOW_MS / 2);
    expect(undoTimeRemainingMs(record(deletedAt), halfway)).toBe(UNDO_WINDOW_MS / 2);
  });
});
