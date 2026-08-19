/**
 * The library list (Document 04 §4.3, Document 05 §4).
 *
 * Rows are not interactive in this slice. Document 05 §4 describes a card with an
 * overflow menu, but every action that menu would hold — open, duplicate, delete, export
 * — arrives with the capsule editor and the local-data page later in Milestone 1b.
 * Rendering the control now would put a dead affordance in a user-reachable path, which
 * `EXECUTION_RULES.md` §5.4 forbids; the row is added to when the actions are real.
 *
 * There is no sync badge either. Sync is 1B and is not open, so a column for it would
 * describe a state that cannot occur.
 */

import { type CapsuleSummary } from '@context-capsule/capsule-core';

import { PROVIDER_LABELS } from '../ui/labels.js';
import { formatTimeAgo } from '../ui/relative-time.js';

export interface CapsuleListProps {
  readonly summaries: readonly CapsuleSummary[];
  /**
   * Read once when the popup opens rather than per row. A browser-action popup lives for
   * seconds, so a ticking clock would repaint the list to change nothing a user is
   * waiting for, and two rows rendered a millisecond apart would be measured against two
   * different "now"s.
   */
  readonly now: Date;
}

export function CapsuleList({ summaries, now }: CapsuleListProps) {
  return (
    <ul className="capsule-list" aria-label="Saved capsules">
      {summaries.map((summary) => {
        const timeAgo = formatTimeAgo(summary.updatedAt, now);

        return (
          <li className="capsule-row" key={summary.id}>
            <h2 className="capsule-row-title">{summary.title}</h2>

            <p className="capsule-row-meta">
              <span>{PROVIDER_LABELS[summary.provider]}</span>
              {timeAgo !== null && (
                <>
                  <span aria-hidden="true"> · </span>
                  {/* The machine-readable timestamp stays on the element, so the exact
                      value survives even though the visible text is an approximation. */}
                  <time dateTime={summary.updatedAt}>{timeAgo}</time>
                </>
              )}
            </p>

            {summary.nextAction !== null && (
              <p className="capsule-row-next">
                <span className="capsule-row-next-label">Next</span> {summary.nextAction}
              </p>
            )}

            {summary.tags.length > 0 && (
              <ul className="capsule-row-tags" aria-label="Tags">
                {summary.tags.map((tag) => (
                  <li className="tag" key={tag}>
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
