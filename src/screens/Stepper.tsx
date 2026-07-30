import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { STEPS, stepIndexFor } from '../steps'
import { useApp } from '../state/AppStore'

/** The single header navigation, shown as a progress stepper. */
export function Stepper() {
  const { reviewers, papers, run } = useApp()
  const { pathname } = useLocation()
  const dataLoaded = reviewers.length > 0 && papers.length > 0
  const hasRun = run != null
  const activeIndex = stepIndexFor(pathname)

  const isDone = (to: string) =>
    to === '/upload' || to === '/settings' ? dataLoaded : hasRun

  return (
    <nav className="stepper" aria-label="Progress">
      {STEPS.map((s, i) => (
        <Fragment key={s.to}>
          {i > 0 && (
            <span className="step__sep" aria-hidden="true">
              ›
            </span>
          )}
          <Link
            to={s.to}
            className={
              'step' + (i === activeIndex ? ' step--active' : '') + (isDone(s.to) ? ' step--done' : '')
            }
            aria-current={i === activeIndex ? 'step' : undefined}
          >
            <span className="step__marker" aria-hidden="true">
              {isDone(s.to) ? '✓' : i + 1}
            </span>
            <span className="step__label">{s.label}</span>
          </Link>
        </Fragment>
      ))}
    </nav>
  )
}
