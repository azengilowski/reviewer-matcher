import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppStoreProvider, useApp } from './state/AppStore'
import { HowItWorksModal } from './screens/HowItWorks'
import { Stepper } from './screens/Stepper'
import { StepFooter } from './screens/StepFooter'
import { UploadScreen } from './screens/UploadScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { MatchScreen } from './screens/MatchScreen'
import { DetailScreen } from './screens/DetailScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { ExportScreen } from './screens/ExportScreen'
import { DebugEngineScreen } from './screens/DebugEngineScreen'

export function App() {
  return (
    <AppStoreProvider>
      <AppShell />
    </AppStoreProvider>
  )
}

function AppShell() {
  const [showHelp, setShowHelp] = useState(false)
  const { reviewers, papers } = useApp()
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  // Reset the scroll container to the top whenever the view changes, so a new
  // screen never opens partway down where the last one was scrolled to.
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [pathname])
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          <svg
            className="app__logo"
            viewBox="0 0 512 512"
            width="22"
            height="22"
            aria-hidden="true"
          >
            <rect width="512" height="512" rx="112" fill="var(--accent)" />
            <g fill="none" stroke="#fff" strokeWidth="34" strokeLinecap="round">
              <circle cx="168" cy="150" r="46" />
              <circle cx="168" cy="362" r="46" />
              <circle cx="344" cy="256" r="46" />
              <path d="M168 196 v120" />
              <path d="M206 172 L306 236" />
              <path d="M206 340 L306 276" />
            </g>
          </svg>
          Reviewer Matcher
        </h1>
        <Stepper />
        {(reviewers.length > 0 || papers.length > 0) && (
          <span
            className="app__counts"
            title={`${reviewers.length} reviewers and ${papers.length} papers loaded`}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21 a8 8 0 0 1 16 0" />
            </svg>
            {reviewers.length}
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2 H6 a2 2 0 0 0 -2 2 v16 a2 2 0 0 0 2 2 h12 a2 2 0 0 0 2 -2 V8 z" />
              <path d="M14 2 v6 h6" />
            </svg>
            {papers.length}
          </span>
        )}
        <button
          className="app__help"
          onClick={() => setShowHelp(true)}
          title="How this app works: privacy, matching, and files"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="app__help-label">How it works</span>
        </button>
      </header>
      {showHelp && <HowItWorksModal onClose={() => setShowHelp(false)} />}
      <main className="app__main" ref={mainRef}>
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<UploadScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/match" element={<MatchScreen />} />
          <Route path="/details" element={<DetailScreen />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/export" element={<ExportScreen />} />
          <Route path="/debug/engine" element={<DebugEngineScreen />} />
          <Route path="*" element={<Navigate to="/upload" replace />} />
        </Routes>
      </main>
      <StepFooter />
    </div>
  )
}
