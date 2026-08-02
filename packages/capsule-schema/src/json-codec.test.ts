import { describe, expect, it } from 'vitest';

import {
  excerptCapsuleJson,
  hostileImportPayloads,
  minimalCapsuleJson,
  validCapsuleJson,
} from './fixtures/index.js';
import { CAPSULE_LIMITS } from './limits.js';
import { findDuplicateTopLevelKeys, parseCapsuleJson, serializeCapsuleJson } from './json-codec.js';

describe('round trip', () => {
  it.each([
    ['full capsule', validCapsuleJson],
    ['minimal capsule', minimalCapsuleJson],
    ['capsule with excerpt', excerptCapsuleJson],
  ])('re-serializes %s byte-for-byte', (_name, json) => {
    const outcome = parseCapsuleJson(json);
    expect(outcome.ok, outcome.ok ? '' : JSON.stringify(outcome.issues)).toBe(true);
    if (!outcome.ok) return;
    expect(serializeCapsuleJson(outcome.capsule)).toBe(json);
  });

  it('survives a second round trip unchanged', () => {
    const first = parseCapsuleJson(validCapsuleJson);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = parseCapsuleJson(serializeCapsuleJson(first.capsule));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.capsule).toEqual(first.capsule);
  });
});

describe('serializeCapsuleJson', () => {
  it('writes canonical field order regardless of construction order', () => {
    const outcome = parseCapsuleJson(validCapsuleJson);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // Rebuild with keys in reverse order; the serializer must not care.
    const shuffled = Object.fromEntries(
      Object.entries(outcome.capsule).reverse(),
    ) as typeof outcome.capsule;

    expect(serializeCapsuleJson(shuffled)).toBe(validCapsuleJson);
  });

  it('omits an absent optional field rather than emitting null', () => {
    const outcome = parseCapsuleJson(minimalCapsuleJson);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(serializeCapsuleJson(outcome.capsule)).not.toContain('"subject"');
  });

  it('ends with a trailing newline', () => {
    const outcome = parseCapsuleJson(minimalCapsuleJson);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(serializeCapsuleJson(outcome.capsule).endsWith('}\n')).toBe(true);
  });
});

describe('findDuplicateTopLevelKeys', () => {
  it('finds a duplicated top-level key', () => {
    expect(findDuplicateTopLevelKeys('{"a":1,"b":2,"a":3}')).toEqual(['a']);
  });

  it('ignores a repeated key inside a nested object', () => {
    expect(findDuplicateTopLevelKeys('{"a":{"x":1},"b":{"x":2}}')).toEqual([]);
  });

  it('ignores repeated strings inside an array value', () => {
    expect(findDuplicateTopLevelKeys('{"tags":["a","a"],"goal":"a"}')).toEqual([]);
  });

  it('ignores a string value that looks like a key', () => {
    expect(findDuplicateTopLevelKeys('{"goal":"goal","title":"t"}')).toEqual([]);
  });

  it('handles escaped quotes inside strings', () => {
    expect(findDuplicateTopLevelKeys('{"a":"he said \\"hi\\"","a":2}')).toEqual(['a']);
  });

  it('compares keys after unescaping', () => {
    expect(findDuplicateTopLevelKeys('{"go\\u0061l":1,"goal":2}')).toEqual(['goal']);
  });

  it('tolerates whitespace between a key and its colon', () => {
    expect(findDuplicateTopLevelKeys('{"a"  :1,\n  "a"\t: 2}')).toEqual(['a']);
  });

  it('returns nothing for an unterminated string and leaves diagnosis to the parser', () => {
    expect(findDuplicateTopLevelKeys('{"a":"unterminated')).toEqual([]);
  });

  it('returns nothing for a top-level array', () => {
    expect(findDuplicateTopLevelKeys('["a","a"]')).toEqual([]);
  });
});

describe('parseCapsuleJson', () => {
  it('rejects a file over the import byte limit before parsing it', () => {
    const oversized = `{"padding":"${'x'.repeat(CAPSULE_LIMITS.maxImportBytes)}"}`;
    const outcome = parseCapsuleJson(oversized);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.issues.map((issue) => issue.code)).toEqual(['payload_too_large']);
  });

  it('honours a lower byte ceiling for the sync payload path', () => {
    const outcome = parseCapsuleJson(validCapsuleJson, { maxBytes: 10 });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.issues[0]?.code).toBe('payload_too_large');
  });

  it('rejects malformed JSON without throwing', () => {
    const outcome = parseCapsuleJson('{"schemaVersion":');
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.issues[0]?.code).toBe('invalid_json');
  });

  it('rejects a duplicated field even when the surviving value is valid', () => {
    const object = JSON.parse(minimalCapsuleJson) as Record<string, unknown>;
    const injected = `{"goal":"Decoy goal.",${JSON.stringify(object).slice(1)}`;

    const outcome = parseCapsuleJson(injected);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.issues.some((issue) => issue.code === 'duplicate_key')).toBe(true);
  });

  it('passes the validation mode through to the validator', () => {
    const withUnknown = JSON.parse(minimalCapsuleJson) as Record<string, unknown>;
    withUnknown['futureField'] = 'value';
    const text = JSON.stringify(withUnknown);

    expect(parseCapsuleJson(text).ok).toBe(false);
    expect(parseCapsuleJson(text, { mode: 'compatibility' }).ok).toBe(true);
  });
});

describe('hostile import corpus', () => {
  it.each(hostileImportPayloads.map((payload) => [payload.name, payload] as const))(
    'handles %s without throwing',
    (_name, payload) => {
      expect(() => parseCapsuleJson(payload.json)).not.toThrow();
    },
  );

  it('rejects every hostile payload except inert markup in content', () => {
    for (const payload of hostileImportPayloads) {
      const outcome = parseCapsuleJson(payload.json);
      const shouldBeAccepted = payload.name === 'script tag in goal text';
      expect(outcome.ok, `${payload.name}: ${payload.expectation}`).toBe(shouldBeAccepted);
    }
  });

  it('stores markup in content as inert text', () => {
    const payload = hostileImportPayloads.find((entry) => entry.name === 'script tag in goal text');
    expect(payload).toBeDefined();
    const outcome = parseCapsuleJson(payload?.json ?? '');
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // Preserved verbatim as text. Escaping is the renderer's job (Document 10 §10);
    // the schema must not silently alter what the user wrote.
    expect(outcome.capsule.goal).toContain('<script>');
  });

  it('leaves Object.prototype untouched after the whole corpus', () => {
    for (const payload of hostileImportPayloads) {
      parseCapsuleJson(payload.json);
    }
    const probe = {} as Record<string, unknown>;
    expect(probe['polluted']).toBeUndefined();
    expect(probe['x-deep']).toBeUndefined();
  });
});
