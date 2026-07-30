import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
// Display fonts, bundled locally (works offline): Space Grotesk for titles
// and the wordmark, Pacifico for the scripted "Peer".
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/pacifico/400.css'
import './index.css'

// HashRouter (not BrowserRouter) so deep links and refreshes work on GitHub
// Pages, which has no server-side rewrite for client routes.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
