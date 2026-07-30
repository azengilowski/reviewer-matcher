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
