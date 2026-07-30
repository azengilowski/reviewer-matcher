import { useMemo, useState } from 'react'
import { useApp } from '../state/AppStore'
import { BoardView } from './BoardView'
import { ScreenShell } from './ScreenShell'

export function MatchScreen() {
  const { reviewers, papers, settings, run, assignments, lockedPapers, status, error, progress, runMatching } =
    useApp()
  const canRun = reviewers.length > 0 && papers.length > 0 && status !== 'running'
  // When re-running would discard unlocked manual edits, ask first (in-app modal,
  // not a native window.confirm which browsers can suppress). null = no dialog.
  const [pendingReRun, setPendingReRun] = useState<number | null>(null)

  function onRun() {
    const unlockedManualEdits = assignments.filter(
      (a) => a.source === 'manual' && !lockedPapers.includes(a.paperId),
    ).length
    if (run && unlockedManualEdits > 0) {
      setPendingReRun(unlockedManualEdits)
      return
    }
    void runMatching()
  }
  function confirmReRun() {
    setPendingReRun(null)
    void runMatching()
  }
  const stale = run != null && JSON.stringify(run.settings) !== JSON.stringify(settings)

  const stats = useMemo(() => {
    const assignedPapers = new Set(assignments.map((a) => a.paperId))
    const assignedReviewers = new Set(assignments.map((a) => a.reviewerId))
    return {
      count: assignments.length,
      unfilledPapers: papers.filter((p) => !assignedPapers.has(p.id)).length,
      idleReviewers: reviewers.filter((r) => !assignedReviewers.has(r.id)).length,
      manual: assignments.filter((a) => a.source === 'manual').length,
    }
  }, [assignments, papers, reviewers])

  return (
    <ScreenShell
      title="Match"
      intro="Run the match, then drag reviewers to fine-tune. Assignments update live."
    >
      {run || status === 'running' ? (
        <>
          <p className="match-summary">
            {reviewers.length} reviewers · {papers.length} papers
          </p>

          <div className="match-actions">
            <button
              className="btn"
              onClick={onRun}
              disabled={!canRun}
              title={
                run
                  ? 'Re-run the match with current settings (locked papers are preserved)'
                  : 'Run the match using the current settings'
              }
            >
              {status === 'running' ? 'Running…' : run ? 'Re-run match' : 'Run match'}
            </button>
          </div>
        </>
      ) : (
        <div className="match-hero">
          <MatchHeroArt />
          <h3 className="match-hero__title">Ready to find your matches</h3>
          <p className="match-hero__sub">
            {reviewers.length > 0 && papers.length > 0
              ? `${reviewers.length} reviewers and ${papers.length} papers are loaded. The matcher pairs every paper with its best-fit reviewers; you can fine-tune the board afterwards.`
              : 'Import reviewers and papers on the Upload step, then come back to run the match.'}
          </p>
          <button
            className="btn"
            onClick={onRun}
            disabled={!canRun}
            title="Run the match using the current settings"
          >
            Run match
          </button>
        </div>
      )}

      {/* Status area: while running, the progress bar takes over the badges'
          spot (same slot, fixed height) so the board below never jumps. */}
      {(status === 'running' || run) && (
        <div className="match-statusbar">
          {status === 'running' ? (
            <div className="match-progress">
              <div className="match-progress__label">
                {progress?.phase === 'download'
                  ? progress.total > 0
                    ? `Downloading matching model… ${Math.round((progress.loaded / progress.total) * 100)}% (one-time, then cached)`
                    : 'Loading matching model (first run downloads once, then cached)…'
                  : progress
                    ? `Embedding & matching… ${progress.loaded}/${progress.total}`
                    : 'Starting…'}
              </div>
              <div className="progressbar">
                <div
                  className="progressbar__fill"
                  style={{
                    width: `${progress && progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 5}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            run && (
              <div className="match-stats">
                <span
                  className={run.stable ? 'badge badge--ok' : 'badge badge--warn'}
                  title={
                    run.stable
                      ? 'Stable: no paper and reviewer both prefer each other over their current match'
                      : 'Not stable: a paper and reviewer would both rather be matched together'
                  }
                >
                  {run.stable ? 'Stable ✓' : 'Not stable'}
                </span>
                <span className="badge" title="Total reviewer–paper assignments">
                  {stats.count} assignments
                </span>
                {stats.manual > 0 && (
                  <span className="badge" title="Assignments you changed by hand (drag, add, or remove)">
                    {stats.manual} manual
                  </span>
                )}
                {stats.unfilledPapers > 0 && (
                  <span className="badge badge--warn" title="Papers with fewer reviewers than their capacity">
                    {stats.unfilledPapers} papers unfilled
                  </span>
                )}
                {stats.idleReviewers > 0 && (
                  <span className="badge" title="Reviewers with no assigned papers">
                    {stats.idleReviewers} reviewers idle
                  </span>
                )}
              </div>
            )
          )}
        </div>
      )}
      {status === 'error' && <p className="match-error">⚠️ {error}</p>}
      {stale && status !== 'running' && (
        <p className="match-stale">⚠️ Settings changed since this match. Re-run to apply them.</p>
      )}

      {run && <BoardView run={run} />}

      {pendingReRun != null && (
        <div className="modal-backdrop" onClick={() => setPendingReRun(null)}>
          <div
            className="modal modal--confirm"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm re-run"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__head">
              <strong>Re-run match?</strong>
              <button className="modal__close" onClick={() => setPendingReRun(null)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="modal__hint">
              This replaces assignments on unlocked papers, discarding {pendingReRun} manual
              edit(s). Locked papers are kept.
            </p>
            <div className="modal__foot">
              <button className="btn btn--ghost" onClick={() => setPendingReRun(null)}>
                Cancel
              </button>
              <button className="btn" onClick={confirmReRun}>
                Re-run match
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenShell>
  )
}

/** Papers-to-reviewers illustration for the pre-run empty state. */
function MatchHeroArt() {
  return (
    <svg className="match-hero__art" viewBox="0 0 220 120" aria-hidden="true">
      {/* connections */}
      <g stroke="var(--accent)" strokeWidth="2" opacity="0.4">
        <path d="M74 32 C 110 32 110 24 146 24" fill="none" />
        <path d="M74 60 C 110 60 110 60 146 60" fill="none" />
        <path d="M74 88 C 110 88 110 96 146 96" fill="none" />
        <path d="M74 32 C 112 32 108 60 146 60" fill="none" />
      </g>
      {/* papers */}
      <g fill="var(--surface)" stroke="var(--border)" strokeWidth="2">
        <rect x="30" y="20" width="44" height="24" rx="6" />
        <rect x="30" y="48" width="44" height="24" rx="6" />
        <rect x="30" y="76" width="44" height="24" rx="6" />
      </g>
      <g fill="var(--border)">
        <rect x="38" y="29" width="28" height="3" rx="1.5" />
        <rect x="38" y="57" width="28" height="3" rx="1.5" />
        <rect x="38" y="85" width="28" height="3" rx="1.5" />
      </g>
      {/* reviewers */}
      <g fill="var(--accent-weak)" stroke="var(--accent)" strokeWidth="2">
        <circle cx="158" cy="24" r="12" />
        <circle cx="158" cy="60" r="12" />
        <circle cx="158" cy="96" r="12" />
      </g>
      <g fill="var(--accent)">
        <circle cx="158" cy="21" r="4" />
        <path d="M150 30 a8 5 0 0 1 16 0 z" />
        <circle cx="158" cy="57" r="4" />
        <path d="M150 66 a8 5 0 0 1 16 0 z" />
        <circle cx="158" cy="93" r="4" />
        <path d="M150 102 a8 5 0 0 1 16 0 z" />
      </g>
    </svg>
  )
}
