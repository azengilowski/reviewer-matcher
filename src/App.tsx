import { useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AppStoreProvider } from './state/AppStore'
import { HowItWorksModal } from './screens/HowItWorks'
import { Stepper } from './screens/Stepper'
import { UploadScreen } from './screens/UploadScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { MatchScreen } from './screens/MatchScreen'
import { DetailScreen } from './screens/DetailScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { DebugEngineScreen } from './screens/DebugEngineScreen'

// The happy path, left to right: upload data, configure, run + tune, review.
const NAV = [
  { to: '/upload', label: 'Upload' },
  { to: '/settings', label: 'Settings' },
  { to: '/match', label: 'Match' },
  { to: '/details', label: 'Details' },
  { to: '/dashboard', label: 'Dashboard' },
]

export function App() {
  return (
    <AppStoreProvider>
      <AppShell />
    </AppStoreProvider>
  )
}

function AppShell() {
  const [showHelp, setShowHelp] = useState(false)
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Reviewer Matcher</h1>
        <nav className="app__nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                isActive ? 'app__navlink app__navlink--active' : 'app__navlink'
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="app__help"
          onClick={() => setShowHelp(true)}
          title="How this app works — privacy, matching, and files"
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
          How it works
        </button>
      </header>
      <Stepper />
      {showHelp && <HowItWorksModal onClose={() => setShowHelp(false)} />}
      <main className="app__main">
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<UploadScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/match" element={<MatchScreen />} />
          <Route path="/details" element={<DetailScreen />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/debug/engine" element={<DebugEngineScreen />} />
          <Route path="*" element={<Navigate to="/upload" replace />} />
        </Routes>
      </main>
    </div>
  )
}
