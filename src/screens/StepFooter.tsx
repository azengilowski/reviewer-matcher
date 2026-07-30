import { Link, useLocation } from 'react-router-dom'
import { STEPS, stepIndexFor } from '../steps'
import { useApp } from '../state/AppStore'

/**
 * Sticky "Next: X →" button shown at the bottom of each step (hidden on the
 * last one). Enabled only once the current step is complete.
 */
export function StepFooter() {
  const { reviewers, papers, run, settingsInvalid } = useApp()
  const { pathname } = useLocation()
  const idx = stepIndexFor(pathname)
  const next = idx >= 0 && idx < STEPS.length - 1 ? STEPS[idx + 1] : null
  if (!next) return null

  const dataLoaded = reviewers.length > 0 && papers.length > 0
  const hasRun = run != null
  const current = STEPS[idx]
  // Upload/Settings need data loaded (and Settings must hold valid values);
  // Match/Review need a completed match.
  const complete =
    current.to === '/upload' || current.to === '/settings'
      ? dataLoaded && !(current.to === '/settings' && settingsInvalid)
      : hasRun
  const reason = complete
    ? undefined
    : settingsInvalid && current.to === '/settings'
      ? 'Enter a valid value for every setting first'
      : dataLoaded
        ? 'Run the match before continuing'
        : 'Import reviewers and papers to continue'

  return (
    <div className="step-footer">
      <div className="step-footer__inner">
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
    </div>
  )
}
