import { Link, useLocation } from 'react-router-dom'
import { STEPS, stepIndexFor } from '../steps'

/** "Next: X →" button shown at the bottom of each step (hidden on the last one). */
export function StepFooter() {
  const { pathname } = useLocation()
  const idx = stepIndexFor(pathname)
  const next = idx >= 0 && idx < STEPS.length - 1 ? STEPS[idx + 1] : null
  if (!next) return null
  return (
    <div className="step-footer">
      <Link className="btn" to={next.to}>
        Next: {next.label} →
      </Link>
    </div>
  )
}
