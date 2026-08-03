import { beforeEach, describe, expect, it } from 'vitest';

import { MemoryCapsuleRepository } from './memory-repository.js';
import {
  REPOSITORY_CONTRACT_CASES,
  primaryContractCapsule,
  secondaryContractCapsule,
} from './repository-contract.js';

describe('MemoryCapsuleRepository', () => {
  let repository: MemoryCapsuleRepository;

  beforeEach(() => {
    repository = new MemoryCapsuleRepository();
  });

  // The shared definition of what any capsule store must do. The IndexedDB repository in
  // the extension runs the same list, so the reference implementation and the one users'
  // capsules actually live in cannot drift apart unnoticed.
  describe('repository contract', () => {
    for (const contractCase of REPOSITORY_CONTRACT_CASES) {
      it(contractCase.name, async () => {
        await contractCase.run(repository);
      });
    }
  });

  // Memory-specific: a real store reports quota exhaustion from the browser, which this
  // implementation can only simulate. The contract case list stays free of it so that it
  // holds for every implementation.
  describe('simulated quota exhaustion', () => {
    it('reports quota exhaustion without losing what was already stored', async () => {
      await repository.save(primaryContractCapsule);
      repository.quotaExceeded = true;

      const result = await repository.save(secondaryContractCapsule);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('quota_exceeded');

      const survivors = await repository.list();
      expect(survivors.ok && survivors.value.map((entry) => entry.id)).toEqual([
        primaryContractCapsule.id,
      ]);
    });
  });
});
