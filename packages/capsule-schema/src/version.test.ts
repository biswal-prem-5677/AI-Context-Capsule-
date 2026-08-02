import { describe, expect, it } from 'vitest';

import { SCHEMA_VERSION } from './types.js';
import {
  CURRENT_SCHEMA_VERSION,
  MIN_SUPPORTED_MAJOR,
  assessSchemaVersion,
  isImportable,
  migrateToCurrentVersion,
  parseSchemaVersion,
} from './version.js';

describe('parseSchemaVersion', () => {
  it('parses a major.minor pair', () => {
    expect(parseSchemaVersion('1.0')).toEqual({ major: 1, minor: 0 });
    expect(parseSchemaVersion('12.34')).toEqual({ major: 12, minor: 34 });
  });

  it.each([
    ['a bare major', '1'],
    ['a patch component', '1.0.0'],
    ['a leading v', 'v1.0'],
    ['free text', 'latest'],
    ['empty', ''],
    ['an over-long number', '1234.0'],
  ])('rejects %s', (_name, value) => {
    expect(parseSchemaVersion(value)).toBeNull();
  });
});

describe('assessSchemaVersion', () => {
  it('recognises the version this build emits', () => {
    expect(assessSchemaVersion(SCHEMA_VERSION)).toBe('current');
  });

  it('treats a newer minor as readable but incomplete', () => {
    const newer = `${String(CURRENT_SCHEMA_VERSION.major)}.${String(CURRENT_SCHEMA_VERSION.minor + 1)}`;
    expect(assessSchemaVersion(newer)).toBe('newer_minor');
    expect(isImportable('newer_minor')).toBe(true);
  });

  it('refuses a future major rather than guessing at field meanings', () => {
    const future = `${String(CURRENT_SCHEMA_VERSION.major + 1)}.0`;
    expect(assessSchemaVersion(future)).toBe('unsupported');
    expect(isImportable('unsupported')).toBe(false);
  });

  it('refuses a major older than the support window', () => {
    expect(assessSchemaVersion(`${String(MIN_SUPPORTED_MAJOR - 1)}.9`)).toBe('unsupported');
  });

  it('refuses an unparseable version', () => {
    expect(assessSchemaVersion('not-a-version')).toBe('unsupported');
  });
});

describe('migrateToCurrentVersion', () => {
  it('stamps the current version and preserves other fields', () => {
    const migrated = migrateToCurrentVersion(
      { schemaVersion: '1.0', title: 'Kept' },
      CURRENT_SCHEMA_VERSION,
    );
    expect(migrated['schemaVersion']).toBe(SCHEMA_VERSION);
    expect(migrated['title']).toBe('Kept');
  });

  it('does not mutate its input', () => {
    const input = { schemaVersion: '1.0', title: 'Kept' };
    migrateToCurrentVersion(input, CURRENT_SCHEMA_VERSION);
    expect(input).toEqual({ schemaVersion: '1.0', title: 'Kept' });
  });
});
