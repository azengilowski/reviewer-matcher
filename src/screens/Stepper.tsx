import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../state/AppStore'

// The intended flow, shown app-wide for orientation. Each step links to its
// screen and fills in as the user progresses (data loaded → run produced).
const STEPS = [
  { to: '/upload', label: 'Upload data' },
  { to: '/settings', label: 'Configure' },
  { to: '/match', label: 'Match & tune' },
  { to: '/dashboard', label: 'Review', match: ['/dashboard', '/details'] },
]

export function Stepper() {
  const { reviewers, papers, run } = useApp()
  const { pathname } = useLocation()
  const dataLoaded = reviewers.length > 0 && papers.length > 0
  const hasRun = run != null
  const done = [dataLoaded, dataLoaded, hasRun, hasRun]
  const activeIndex = STEPS.findIndex((s) =>
    (s.match ?? [s.to]).some((m) => pathname.startsWith(m)),
  )

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
              'step' +
              (i === activeIndex ? ' step--active' : '') +
              (done[i] ? ' step--done' : '')
            }
            aria-current={i === activeIndex ? 'step' : undefined}
          >
            <span className="step__marker">{done[i] ? '✓' : i + 1}</span>
            <span className="step__label">{s.label}</span>
          </Link>
        </Fragment>
      ))}
    </nav>
  )
}
