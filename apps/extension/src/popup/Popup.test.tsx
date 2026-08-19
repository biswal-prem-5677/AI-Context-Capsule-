/**
 * @vitest-environment jsdom
 */

import { parseCapsuleJson } from '@context-capsule/capsule-schema';
import { validCapsuleJson } from '@context-capsule/capsule-schema/fixtures';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { indexedDB } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setCapsuleRepositoryForTesting } from '../app/repository.js';
import { IndexedDbCapsuleRepository } from '../storage/indexeddb-repository.js';
import { Popup } from './Popup.js';

let fixtureCounter = 0;

function createFixtureCapsule(
  overrides: {
    id?: string;
    title?: string;
    provider?: 'chatgpt' | 'claude' | 'gemini' | 'manual' | 'imported' | 'other';
    tags?: string[];
  } = {},
) {
  const outcome = parseCapsuleJson(validCapsuleJson);
  if (!outcome.ok) throw new Error('Fixture failed to parse');
  const base = outcome.capsule;
  fixtureCounter += 1;
  const hex = fixtureCounter.toString(16).padStart(12, '0');
  const uniqueId = `00000000-0000-4000-8000-${hex}`;
  return {
    ...base,
    id: overrides.id ?? uniqueId,
    title: overrides.title ?? base.title,
    tags: overrides.tags ?? base.tags,
    source: {
      ...base.source,
      provider: overrides.provider ?? base.source.provider,
    },
  };
}

describe('Popup UI Component', () => {
  let repository: IndexedDbCapsuleRepository;

  beforeEach(() => {
    repository = new IndexedDbCapsuleRepository({
      factory: indexedDB,
      databaseName: `test-popup-${Date.now()}-${Math.random()}`,
    });
    setCapsuleRepositoryForTesting(repository);
  });

  afterEach(() => {
    cleanup();
    setCapsuleRepositoryForTesting(null);
  });

  it('renders loading state initially and transitions to empty library state', async () => {
    render(<Popup />);

    // Initially loading
    expect(screen.getByText('Opening your library...')).not.toBeNull();

    // Resolves to empty library state
    await waitFor(() => {
      expect(screen.getByText('No capsules saved yet.')).not.toBeNull();
    });
  });

  it('renders capsules list when storage contains saved capsules', async () => {
    const sample = createFixtureCapsule({
      title: 'Project Architecture Handoff',
      provider: 'chatgpt',
      tags: ['architecture', 'docs'],
    });
    await repository.save(sample);

    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText('Project Architecture Handoff')).not.toBeNull();
    });

    expect(screen.getByText('ChatGPT')).not.toBeNull();
    expect(screen.getByText('architecture')).not.toBeNull();
  });

  it('filters capsule list by search text and provider chip', async () => {
    const capsule1 = createFixtureCapsule({
      title: 'ChatGPT Refactoring Notes',
      provider: 'chatgpt',
    });
    const capsule2 = createFixtureCapsule({
      title: 'Claude Design System Handoff',
      provider: 'claude',
    });
    await repository.save(capsule1);
    await repository.save(capsule2);

    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText('ChatGPT Refactoring Notes')).not.toBeNull();
      expect(screen.getByText('Claude Design System Handoff')).not.toBeNull();
    });

    // Search filter
    const searchInput = screen.getByPlaceholderText('Dashboard handoff');
    fireEvent.change(searchInput, { target: { value: 'Refactoring' } });

    expect(screen.getByText('ChatGPT Refactoring Notes')).not.toBeNull();
    expect(screen.queryByText('Claude Design System Handoff')).toBeNull();

    // Clear search and filter by provider chip
    fireEvent.change(searchInput, { target: { value: '' } });
    const claudeRadio = screen.getByLabelText('Claude');
    fireEvent.click(claudeRadio);

    expect(screen.queryByText('ChatGPT Refactoring Notes')).toBeNull();
    expect(screen.getByText('Claude Design System Handoff')).not.toBeNull();
  });

  it('shows search empty state when query matches no capsules', async () => {
    const sample = createFixtureCapsule({
      title: 'Database Schema Review',
      provider: 'gemini',
    });
    await repository.save(sample);

    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText('Database Schema Review')).not.toBeNull();
    });

    const searchInput = screen.getByPlaceholderText('Dashboard handoff');
    fireEvent.change(searchInput, { target: { value: 'nonexistent-term' } });

    expect(screen.getByText('No capsules match your search.')).not.toBeNull();
  });

  it('focuses search input when "/" keyboard key is pressed', async () => {
    const sample = createFixtureCapsule({
      title: 'Keyboard Shortcut Test Capsule',
      provider: 'manual',
    });
    await repository.save(sample);

    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcut Test Capsule')).not.toBeNull();
    });

    const searchInput = screen.getByPlaceholderText('Dashboard handoff');
    expect(document.activeElement).not.toBe(searchInput);

    fireEvent.keyDown(window, { key: '/' });

    expect(document.activeElement).toBe(searchInput);
  });
});
