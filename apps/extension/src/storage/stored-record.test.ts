import { UNKNOWN_FIELDS_EXTENSION_KEY, parseCapsuleJson } from '@context-capsule/capsule-schema';
import { validCapsuleJson } from '@context-capsule/capsule-schema/fixtures';
import { describe, expect, it } from 'vitest';

import { readStoredDeletedAt, readStoredRecord, readStoredRevision } from './stored-record.js';

const parsed = parseCapsuleJson(validCapsuleJson);
if (!parsed.ok) throw new Error('The stored-record fixture no longer validates.');
const capsule = parsed.capsule;

const DELETED_AT = '2026-08-03T12:00:00.000Z';

function stored(overrides: Readonly<Record<string, unknown>> = {}): unknown {
  return { capsule, revision: 1, deletedAt: null, ...overrides };
}

function reasonFor(entry: unknown): string {
  const outcome = readStoredRecord(entry);
  if (outcome.ok) throw new Error('Expected the stored value to be rejected.');
  return outcome.reason;
}

describe('readStoredRecord', () => {
  it('returns the capsule, revision, and tombstone of a well-formed record', () => {
    const outcome = readStoredRecord(stored({ revision: 7, deletedAt: DELETED_AT }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.record.capsule.id).toBe(capsule.id);
    expect(outcome.record.revision).toBe(7);
    expect(outcome.record.deletedAt).toBe(DELETED_AT);
  });

  it.each([
    ['null', null],
    ['a string', 'capsule'],
    ['a number', 3],
    ['an array', []],
  ])('rejects %s as a stored value', (_label, entry) => {
    // An array is an object, so it reaches the revision check rather than the type check.
    // Either rejection is correct; what matters is that nothing is returned as a capsule.
    expect(readStoredRecord(entry).ok).toBe(false);
  });

  it.each([
    ['missing', { revision: undefined }],
    ['zero', { revision: 0 }],
    ['negative', { revision: -1 }],
    ['fractional', { revision: 1.5 }],
    ['a string', { revision: '1' }],
  ])('rejects a revision that is %s', (_label, overrides) => {
    expect(reasonFor(stored(overrides))).toContain('positive integer');
  });

  it('rejects a deletion timestamp that is not an RFC 3339 UTC instant', () => {
    expect(reasonFor(stored({ deletedAt: 'yesterday' }))).toContain('RFC 3339');
    expect(reasonFor(stored({ deletedAt: '2026-08-03T12:00:00+02:00' }))).toContain('RFC 3339');
  });

  it('rejects a capsule that fails validation, naming the first issue', () => {
    const reason = reasonFor(stored({ capsule: { ...capsule, title: '' } }));
    expect(reason).toContain('failed validation');
    expect(reason).toContain('issue(s)');
  });

  it('rejects a missing capsule rather than returning a partial record', () => {
    expect(reasonFor({ revision: 1, deletedAt: null })).toContain('failed validation');
  });

  // Document 10 §4.7: a capsule written by a newer minor version keeps its unrecognised
  // root fields instead of being declared corrupt. A user who updates, saves, and rolls
  // back must not lose the capsule.
  it('accepts a capsule carrying fields this build does not know', () => {
    const outcome = readStoredRecord(
      stored({ capsule: { ...capsule, futureField: 'written by a later build' } }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.record.capsule.extensions[UNKNOWN_FIELDS_EXTENSION_KEY]).toEqual({
      futureField: 'written by a later build',
    });
  });
});

describe('readStoredRevision', () => {
  it('reads the revision of a record whose capsule is unreadable', () => {
    // This is what makes a repair keep the revision count: saving over a corrupt record
    // must not restart at 1 and tell a stale editor its copy is current.
    expect(readStoredRevision({ capsule: { id: 'x' }, revision: 9 })).toBe(9);
  });

  it.each([
    ['a missing revision', {}],
    ['a non-object', null],
    ['a fractional revision', { revision: 2.5 }],
    ['a zero revision', { revision: 0 }],
  ])('returns 0 for %s', (_label, entry) => {
    expect(readStoredRevision(entry)).toBe(0);
  });
});

describe('readStoredDeletedAt', () => {
  it('reads a well-formed tombstone', () => {
    expect(readStoredDeletedAt({ deletedAt: DELETED_AT })).toBe(DELETED_AT);
  });

  it.each([
    ['a live record', { deletedAt: null }],
    ['a missing field', {}],
    ['an unparsable timestamp', { deletedAt: 'yesterday' }],
    ['a non-object', 'deleted'],
  ])('returns null for %s', (_label, entry) => {
    // Unreadable resolves to "not deleted" on purpose: purgeExpired must never destroy a
    // record whose undo window it cannot evaluate.
    expect(readStoredDeletedAt(entry)).toBeNull();
  });
});
