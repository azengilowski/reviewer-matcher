import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
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
