/**
 * The one panel every non-list state uses: loading, empty library, empty search, failure.
 *
 * They share a shape because they answer the same three questions — what happened, what
 * it means, and what to do next. Document 04 §8 requires all four to exist and
 * `EXECUTION_RULES.md` §5.4 requires the failure ones to be actionable; a single
 * component is how a new state gets those properties by construction rather than by the
 * author remembering.
 */

export interface StatusAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface StatusPanelProps {
  /** `danger` is reserved for a failure. A quiet library is not an error. */
  readonly tone: 'neutral' | 'danger';
  readonly title: string;
  /** Never blank: a heading with no explanation leaves the user guessing. */
  readonly detail: string;
  readonly action?: StatusAction | undefined;
  /**
   * Announce this panel when it appears. Set it for a state the user arrives at without
   * looking — a search going quiet, a read failing — and leave it off for the state a
   * surface opens in, which a screen reader reads anyway (Document 05 §7).
   */
  readonly announce?: boolean | undefined;
}

export function StatusPanel({ tone, title, detail, action, announce = false }: StatusPanelProps) {
  return (
    <div
      className={`status-panel status-panel-${tone}`}
      role={announce ? 'status' : undefined}
      data-testid="status-panel"
    >
      <h2 className="status-panel-title">{title}</h2>
      <p className="status-panel-detail">{detail}</p>
      {action !== undefined && (
        <button type="button" className="button button-secondary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
