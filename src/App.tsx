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
          🔒 How it works
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
