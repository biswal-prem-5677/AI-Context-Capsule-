import { parseCapsuleJson, type Capsule } from '@context-capsule/capsule-schema';
import { minimalCapsuleJson, validCapsuleJson } from '@context-capsule/capsule-schema/fixtures';
import { beforeEach, describe, expect, it } from 'vitest';

import { UNDO_WINDOW_MS } from './lifecycle.js';
import { MemoryCapsuleRepository } from './memory-repository.js';

function fixture(json: string): Capsule {
  const outcome = parseCapsuleJson(json);
  if (!outcome.ok) throw new Error('fixture did not validate');
  return outcome.capsule;
}

const deletedAt = new Date('2026-08-03T12:00:00.000Z');

describe('MemoryCapsuleRepository', () => {
  let repository: MemoryCapsuleRepository;
  let capsule: Capsule;

  beforeEach(async () => {
    repository = new MemoryCapsuleRepository();
    capsule = fixture(validCapsuleJson);
    await repository.save(capsule);
  });

  it('returns a summary carrying what a library row needs', async () => {
    const result = await repository.list();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([
      {
        id: capsule.id,
        title: capsule.title,
        updatedAt: capsule.updatedAt,
        provider: 'chatgpt',
        nextAction: 'Build authenticated dashboard UI',
        tags: ['coding', 'dashboard'],
      },
    ]);
  });

  it('reports a missing capsule as not_found rather than throwing', async () => {
    const result = await repository.get('00000000-0000-4000-8000-000000000000');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('increments the revision on every write', async () => {
    const first = await repository.get(capsule.id);
    expect(first.ok && first.value.revision).toBe(1);
    const second = await repository.save(capsule);
    expect(second.ok && second.value.revision).toBe(2);
  });

  it('hides a soft-deleted capsule from the library but keeps it recoverable', async () => {
    await repository.softDelete(capsule.id, deletedAt);

    const visible = await repository.list();
    expect(visible.ok && visible.value).toEqual([]);

    const all = await repository.list({ includeDeleted: true });
    expect(all.ok && all.value).toHaveLength(1);

    const restored = await repository.restore(capsule.id);
    expect(restored.ok && restored.value.deletedAt).toBeNull();

    const afterUndo = await repository.list();
    expect(afterUndo.ok && afterUndo.value).toHaveLength(1);
  });

  it('refuses to soft-delete the same capsule twice', async () => {
    await repository.softDelete(capsule.id, deletedAt);
    const second = await repository.softDelete(capsule.id, deletedAt);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error.code).toBe('not_found');
  });

  it('revives a soft-deleted capsule when it is saved over', async () => {
    await repository.softDelete(capsule.id, deletedAt);
    const saved = await repository.save(capsule);
    expect(saved.ok && saved.value.deletedAt).toBeNull();
  });

  it('purges only records whose undo window has closed', async () => {
    const other = fixture(minimalCapsuleJson);
    await repository.save(other);
    await repository.softDelete(capsule.id, deletedAt);

    const tooSoon = await repository.purgeExpired(
      new Date(deletedAt.getTime() + UNDO_WINDOW_MS - 1),
    );
    expect(tooSoon.ok && tooSoon.value).toEqual([]);

    const later = await repository.purgeExpired(new Date(deletedAt.getTime() + UNDO_WINDOW_MS));
    expect(later.ok && later.value).toEqual([capsule.id]);

    // The live capsule was untouched; only the expired tombstone went.
    const remaining = await repository.list();
    expect(remaining.ok && remaining.value.map((entry) => entry.id)).toEqual([other.id]);
  });

  it('cannot restore a capsule after it has been purged', async () => {
    await repository.softDelete(capsule.id, deletedAt);
    await repository.purgeExpired(new Date(deletedAt.getTime() + UNDO_WINDOW_MS));
    const restored = await repository.restore(capsule.id);
    expect(restored.ok).toBe(false);
  });

  it('reports quota exhaustion without losing what was already stored', async () => {
    repository.quotaExceeded = true;
    const result = await repository.save(fixture(minimalCapsuleJson));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('quota_exceeded');

    const survivors = await repository.list();
    expect(survivors.ok && survivors.value.map((entry) => entry.id)).toEqual([capsule.id]);
  });

  it('clears every capsule, including tombstones', async () => {
    await repository.softDelete(capsule.id, deletedAt);
    await repository.clear();
    const all = await repository.list({ includeDeleted: true });
    expect(all.ok && all.value).toEqual([]);
  });
});
