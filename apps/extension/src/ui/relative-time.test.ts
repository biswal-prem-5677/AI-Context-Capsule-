import { describe, expect, it } from 'vitest';

import { formatTimeAgo } from './relative-time.js';

const NOW = new Date('2026-08-06T12:00:00.000Z');

function isoAgo(milliseconds: number): string {
  return new Date(NOW.getTime() - milliseconds).toISOString();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatTimeAgo', () => {
  it('says "Just now" below a minute', () => {
    expect(formatTimeAgo(isoAgo(0), NOW)).toBe('Just now');
    expect(formatTimeAgo(isoAgo(MINUTE - 1), NOW)).toBe('Just now');
  });

  it('counts whole minutes, hours, and days', () => {
    expect(formatTimeAgo(isoAgo(MINUTE), NOW)).toBe('1 minute ago');
    expect(formatTimeAgo(isoAgo(59 * MINUTE), NOW)).toBe('59 minutes ago');
    expect(formatTimeAgo(isoAgo(HOUR), NOW)).toBe('1 hour ago');
    expect(formatTimeAgo(isoAgo(23 * HOUR), NOW)).toBe('23 hours ago');
    expect(formatTimeAgo(isoAgo(DAY), NOW)).toBe('1 day ago');
    expect(formatTimeAgo(isoAgo(6 * DAY), NOW)).toBe('6 days ago');
  });

  it('truncates rather than rounds, so a row never claims more age than it has', () => {
    expect(formatTimeAgo(isoAgo(2 * HOUR - 1), NOW)).toBe('1 hour ago');
  });

  /**
   * The boundary between the relative phrase and the absolute date. Asserted through
   * `Intl` rather than against a hardcoded "30 Jul 2026", because the test runner's
   * locale decides the wording and a literal would only pass on one machine.
   */
  it('switches to an absolute date at seven days', () => {
    const sevenDaysAgo = isoAgo(7 * DAY);
    const expected = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(Date.parse(sevenDaysAgo));

    expect(formatTimeAgo(isoAgo(7 * DAY - 1), NOW)).toBe('6 days ago');
    expect(formatTimeAgo(sevenDaysAgo, NOW)).toBe(expected);
  });

  /**
   * Two devices whose clocks disagree, or a system clock moved back. Without the clamp
   * this renders "in 5 minutes", which reads as a defect in the extension rather than as
   * a difference between two clocks.
   */
  it('clamps a future timestamp instead of counting forwards', () => {
    const future = new Date(NOW.getTime() + 5 * MINUTE).toISOString();
    expect(formatTimeAgo(future, NOW)).toBe('Just now');
  });

  it('returns null for a timestamp it cannot parse', () => {
    expect(formatTimeAgo('not a date', NOW)).toBeNull();
    expect(formatTimeAgo('', NOW)).toBeNull();
  });
});
