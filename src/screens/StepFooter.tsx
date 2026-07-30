import { Link, useLocation } from 'react-router-dom'
import { STEPS, stepIndexFor } from '../steps'
import { useApp } from '../state/AppStore'

/**
 * Sticky "Next: X →" button shown at the bottom of each step (hidden on the
 * last one). Enabled only once the current step is complete.
 */
export function StepFooter() {
  const { reviewers, papers, run } = useApp()
  const { pathname } = useLocation()
  const idx = stepIndexFor(pathname)
  const next = idx >= 0 && idx < STEPS.length - 1 ? STEPS[idx + 1] : null
  if (!next) return null

  const dataLoaded = reviewers.length > 0 && papers.length > 0
  const hasRun = run != null
  const current = STEPS[idx]
  // Upload/Settings need data loaded; Match/Review need a completed match.
  const complete = current.to === '/upload' || current.to === '/settings' ? dataLoaded : hasRun
  const reason = complete
    ? undefined
    : dataLoaded
      ? 'Run the match before continuing'
      : 'Import reviewers and papers to continue'

  return (
    <div className="step-footer">
      {complete ? (
        <Link className="btn" to={next.to}>
          Next: {next.label} →
        </Link>
      ) : (
        <button className="btn" disabled title={reason} aria-label={reason}>
          Next: {next.label} →
        </button>
      )}
    </div>
  )
}
