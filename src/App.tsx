import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppStoreProvider, useApp } from './state/AppStore'
import { HomeScreen } from './screens/HomeScreen'
import { HowItWorksModal } from './screens/HowItWorks'
import { Wordmark } from './screens/Logo'
import { Stepper } from './screens/Stepper'
import { StepFooter } from './screens/StepFooter'
import { UpdatePrompt } from './screens/UpdatePrompt'
import { UploadScreen } from './screens/UploadScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { MatchScreen } from './screens/MatchScreen'
import { DetailScreen } from './screens/DetailScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { WorkloadScreen } from './screens/WorkloadScreen'
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
  const [showReset, setShowReset] = useState(false)
  const { reviewers, papers, resetApp, resetEpoch } = useApp()
  const navigate = useNavigate()
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
        <div className="app__header-inner">
        <h1 className="app__title">
          <Link to="/" className="app__homelink" title="Home">
            <Wordmark />
          </Link>
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
          className="app__reset"
          onClick={() => setShowReset(true)}
          title="Reset the app: clear all data and restore default settings"
          aria-label="Reset the app"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12 a9 9 0 1 0 3 -6.7" />
            <path d="M3 4 v5 h5" />
          </svg>
        </button>
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
        </div>
      </header>
      {showHelp && <HowItWorksModal onClose={() => setShowHelp(false)} />}
      {showReset && (
        <div className="modal-backdrop" onClick={() => setShowReset(false)}>
          <div
            className="modal modal--confirm"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm app reset"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__head">
              <strong>Reset the app?</strong>
              <button className="modal__close" onClick={() => setShowReset(false)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="modal__hint">
              This clears all uploaded reviewers and papers, the match and every edit, and restores
              default settings. Export a <code>.matchproj</code> first if you want to keep your
              work. This can't be undone.
            </p>
            <div className="modal__foot">
              <button className="btn btn--ghost" onClick={() => setShowReset(false)}>
                Cancel
              </button>
              <button
                className="btn btn--danger"
                onClick={() => {
                  resetApp()
                  setShowReset(false)
                  navigate('/')
                }}
              >
                Reset everything
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Keyed on resetEpoch so a full app reset also clears screens' local UI
          state (e.g. a half-configured import wizard). */}
      <main className="app__main" ref={mainRef} key={resetEpoch}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/upload" element={<UploadScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/match" element={<MatchScreen />} />
          <Route path="/details" element={<DetailScreen />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/workload" element={<WorkloadScreen />} />
          <Route path="/export" element={<ExportScreen />} />
          <Route path="/debug/engine" element={<DebugEngineScreen />} />
          <Route path="*" element={<Navigate to="/upload" replace />} />
        </Routes>
      </main>
      <StepFooter />
      <UpdatePrompt />
    </div>
  )
}
