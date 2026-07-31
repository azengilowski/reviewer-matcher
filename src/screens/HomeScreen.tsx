import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/AppStore'
import { HowItWorksModal } from './HowItWorks'
import { Logo, Wordmark } from './Logo'

/** Landing screen: name, logo, a one-line pitch, and the two ways in. */
export function HomeScreen() {
  const { reviewers, papers, run } = useApp()
  const [showHelp, setShowHelp] = useState(false)
  const hasData = reviewers.length > 0 || papers.length > 0

  return (
    <div className="home">
      <Logo size={72} />
      <h2 className="home__title">
        <Wordmark />
      </h2>
      <p className="home__tagline">
        Match academic reviewers to papers with in-browser AI. Nothing is uploaded: your data never
        leaves your device.
      </p>

      <div className="home__actions">
        <Link className="btn home__cta" to={run ? '/match' : '/upload'}>
          {hasData ? 'Continue →' : 'Get started →'}
        </Link>
        <button className="btn btn--howto" onClick={() => setShowHelp(true)}>
          How it works
        </button>
      </div>

      <ul className="home__points">
        <li>
          <PointIcon kind="lock" />
          <span>
            <strong>Private by design:</strong> runs entirely in your browser
          </span>
        </li>
        <li>
          <PointIcon kind="spark" />
          <span>
            <strong>Smart matching:</strong> by topic, with a fair, stable algorithm
          </span>
        </li>
        <li>
          <PointIcon kind="hand" />
          <span>
            <strong>You stay in control:</strong> drag, lock, and undo any assignment
          </span>
        </li>
      </ul>

      {showHelp && <HowItWorksModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}

function PointIcon({ kind }: { kind: 'lock' | 'spark' | 'hand' }) {
  const paths = {
    lock: (
      <>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11 V7 a4 4 0 0 1 8 0 v4" />
      </>
    ),
    spark: (
      <>
        <path d="M12 3 l1.9 5.6 L19.5 10.5 l-5.6 1.9 L12 18 l-1.9-5.6 L4.5 10.5 l5.6-1.9 z" />
      </>
    ),
    hand: (
      <>
        <path d="M9 11 V5 a1.5 1.5 0 0 1 3 0 v5" />
        <path d="M12 10 V4.5 a1.5 1.5 0 0 1 3 0 V11" />
        <path d="M15 11 V6 a1.5 1.5 0 0 1 3 0 v7 a6 6 0 0 1 -6 6 h-1 a6 6 0 0 1 -5 -2.7 L4.4 14.6 a1.5 1.5 0 0 1 2.4 -1.8 L9 15" />
      </>
    ),
  }
  return (
    <svg
      className="home__pointicon"
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[kind]}
    </svg>
  )
}
