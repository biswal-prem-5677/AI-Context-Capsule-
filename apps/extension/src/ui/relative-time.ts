/**
 * "3 hours ago" for a capsule row (Document 04 §4.3).
 *
 * `Intl` rather than hand-written strings: it pluralises correctly, and the absolute
 * fallback follows the reader's date order instead of assuming one. The extension ships
 * no translations yet, so `undefined` means "whatever the browser is set to" — the
 * numbers and date order adapt even while the surrounding copy is English.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Past this age a relative phrase stops being informative — "23 days ago" makes a reader
 * do arithmetic that a date does for them.
 */
const ABSOLUTE_AFTER_MS = 7 * DAY_MS;

/**
 * `numeric: 'always'` gives "1 day ago" rather than "yesterday".
 *
 * This function measures elapsed milliseconds, not calendar days, so a capsule saved at
 * 23:50 would become "yesterday" ten minutes later — a word that means a calendar day and
 * would be wrong. Elapsed time is the honest thing to say when elapsed time is what was
 * measured; calendar-correct wording needs a timezone-aware day boundary, which is worth
 * adding only if the extra precision ever matters here.
 */
const RELATIVE_FORMAT = new Intl.RelativeTimeFormat(undefined, { numeric: 'always' });

const ABSOLUTE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/**
 * Render `isoTimestamp` as an age relative to `now`.
 *
 * `now` is a parameter rather than a `new Date()` inside, so the same list renders the
 * same way for every row and a test does not race the clock (Document 14 §4).
 *
 * Returns `null` for a timestamp that cannot be parsed. A capsule summary comes from a
 * validated capsule, so this should not happen — but the caller renders nothing rather
 * than `Invalid Date`, because a row with an unreadable date is still a row a user needs
 * to be able to find.
 */
export function formatTimeAgo(isoTimestamp: string, now: Date): string | null {
  const updatedMs = Date.parse(isoTimestamp);
  if (Number.isNaN(updatedMs)) return null;

  // A timestamp slightly ahead of the clock is a skew between two devices or a system
  // clock change, not a capsule edited in the future. Clamping keeps "in 2 minutes" —
  // which reads as a bug — out of the list.
  const elapsedMs = Math.max(0, now.getTime() - updatedMs);

  if (elapsedMs >= ABSOLUTE_AFTER_MS) return ABSOLUTE_FORMAT.format(updatedMs);
  if (elapsedMs >= DAY_MS) return RELATIVE_FORMAT.format(-Math.floor(elapsedMs / DAY_MS), 'day');
  if (elapsedMs >= HOUR_MS) return RELATIVE_FORMAT.format(-Math.floor(elapsedMs / HOUR_MS), 'hour');
  if (elapsedMs >= MINUTE_MS) {
    return RELATIVE_FORMAT.format(-Math.floor(elapsedMs / MINUTE_MS), 'minute');
  }
  // Under a minute. "0 minutes ago" is what `Intl` would produce and is not what anyone
  // says, so this one phrase is a literal.
  return 'Just now';
}
