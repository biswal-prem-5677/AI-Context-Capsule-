import { IDBFactory as FakeIdbFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  CAPSULE_DATABASE_NAME,
  CAPSULE_DATABASE_VERSION,
  CAPSULE_KEY_PATH,
  CAPSULE_STORE_NAME,
  StorageUnavailableError,
  classifyStorageError,
  describeStorageError,
  openCapsuleDatabase,
  requestResult,
  transactionSettled,
} from './database.js';

let factory: IDBFactory;

beforeEach(() => {
  factory = new FakeIdbFactory();
});

describe('openCapsuleDatabase', () => {
  it('creates the capsules store, keyed by the capsule id inside the envelope', async () => {
    const database = await openCapsuleDatabase(factory);
    try {
      expect(database.name).toBe(CAPSULE_DATABASE_NAME);
      expect(database.version).toBe(CAPSULE_DATABASE_VERSION);
      expect(Array.from(database.objectStoreNames)).toEqual([CAPSULE_STORE_NAME]);

      const store = database
        .transaction(CAPSULE_STORE_NAME, 'readonly')
        .objectStore(CAPSULE_STORE_NAME);
      expect(store.keyPath).toBe(CAPSULE_KEY_PATH);
      // Document 08 §2 only permits an index "where it improves a defined query"; search
      // and sort are pure functions over summaries, so there is no such query yet.
      expect(Array.from(store.indexNames)).toEqual([]);
    } finally {
      database.close();
    }
  });

  it('reopens an existing database without rerunning the upgrade', async () => {
    const first = await openCapsuleDatabase(factory);
    first.close();

    const second = await openCapsuleDatabase(factory);
    try {
      expect(Array.from(second.objectStoreNames)).toEqual([CAPSULE_STORE_NAME]);
    } finally {
      second.close();
    }
  });

  it('rejects rather than hanging when the factory refuses to open', async () => {
    const blocked = {
      open() {
        throw new DOMException('Site data is blocked.', 'SecurityError');
      },
    } as unknown as IDBFactory;

    await expect(openCapsuleDatabase(blocked)).rejects.toThrow('Site data is blocked.');
  });
});

describe('requestResult', () => {
  it('resolves with the request result', async () => {
    const database = await openCapsuleDatabase(factory);
    try {
      const store = database
        .transaction(CAPSULE_STORE_NAME, 'readonly')
        .objectStore(CAPSULE_STORE_NAME);
      await expect(requestResult(store.count())).resolves.toBe(0);
    } finally {
      database.close();
    }
  });

  it('rejects when the request fails', async () => {
    const database = await openCapsuleDatabase(factory);
    try {
      const store = database
        .transaction(CAPSULE_STORE_NAME, 'readwrite')
        .objectStore(CAPSULE_STORE_NAME);
      // A duplicate key fails the *request* asynchronously rather than throwing at the
      // call site, which is the path `requestResult` exists to translate.
      await requestResult(store.add({ capsule: { id: 'a' }, revision: 1 }));
      await expect(
        requestResult(store.add({ capsule: { id: 'a' }, revision: 1 })),
      ).rejects.toMatchObject({ name: 'ConstraintError' });
    } finally {
      database.close();
    }
  });
});

describe('transactionSettled', () => {
  it('resolves once the transaction commits', async () => {
    const database = await openCapsuleDatabase(factory);
    try {
      const transaction = database.transaction(CAPSULE_STORE_NAME, 'readwrite');
      const settled = transactionSettled(transaction);
      transaction.objectStore(CAPSULE_STORE_NAME).put({ capsule: { id: 'a' }, revision: 1 });
      await expect(settled).resolves.toBeUndefined();

      // The write is only observable after the commit the promise waited for.
      const store = database
        .transaction(CAPSULE_STORE_NAME, 'readonly')
        .objectStore(CAPSULE_STORE_NAME);
      await expect(requestResult(store.count())).resolves.toBe(1);
    } finally {
      database.close();
    }
  });

  it('rejects when the transaction aborts, leaving nothing written', async () => {
    const database = await openCapsuleDatabase(factory);
    try {
      const transaction = database.transaction(CAPSULE_STORE_NAME, 'readwrite');
      const settled = transactionSettled(transaction);
      transaction.objectStore(CAPSULE_STORE_NAME).put({ capsule: { id: 'a' }, revision: 1 });
      transaction.abort();
      await expect(settled).rejects.toBeDefined();

      const store = database
        .transaction(CAPSULE_STORE_NAME, 'readonly')
        .objectStore(CAPSULE_STORE_NAME);
      await expect(requestResult(store.count())).resolves.toBe(0);
    } finally {
      database.close();
    }
  });
});

describe('classifyStorageError', () => {
  it.each([
    ['QuotaExceededError', 'quota_exceeded'],
    ['ConstraintError', 'conflict'],
  ] as const)('maps %s to %s', (name, code) => {
    expect(classifyStorageError(new DOMException('failed', name))).toBe(code);
  });

  it.each([
    ['an unrecognised DOMException', new DOMException('failed', 'UnknownError')],
    ['a plain Error', new Error('failed')],
    ['a StorageUnavailableError', new StorageUnavailableError('failed')],
    ['a string', 'failed'],
    ['null', null],
    ['undefined', undefined],
  ])('falls back to unavailable for %s', (_label, error) => {
    // An unclassified failure is not evidence that the data is fine, so it gets the
    // explain/retry/export response rather than being passed through as something milder.
    expect(classifyStorageError(error)).toBe('unavailable');
  });

  it('classifies by name rather than by message wording', () => {
    // The message is user-facing copy and will be translated; classification must not
    // depend on it.
    expect(classifyStorageError(new DOMException('quota exceeded', 'UnknownError'))).toBe(
      'unavailable',
    );
  });
});

describe('describeStorageError', () => {
  it('names the error and its message', () => {
    expect(describeStorageError(new DOMException('the disk is full', 'QuotaExceededError'))).toBe(
      'QuotaExceededError: the disk is full',
    );
  });

  it('reads a duck-typed failure that does not extend Error', () => {
    expect(describeStorageError({ name: 'AbortError', message: 'aborted' })).toBe(
      'AbortError: aborted',
    );
  });

  it('degrades to a fixed sentence rather than stringifying an unknown value', () => {
    // Nothing derived from a stored value reaches this string: it goes to logs, and
    // Document 07 §7 forbids logging capsule text.
    expect(describeStorageError('a capsule about a private matter')).toBe(
      'no further detail available',
    );
    expect(describeStorageError(null)).toBe('no further detail available');
  });

  it('keeps the message when the failure has no name', () => {
    expect(describeStorageError({ message: 'something went wrong' })).toBe('something went wrong');
  });
});

describe('StorageUnavailableError', () => {
  it('is identified by its type, not by its wording', () => {
    const error = new StorageUnavailableError('The local capsule database could not be opened.');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('StorageUnavailableError');
  });
});
