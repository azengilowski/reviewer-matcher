import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App shell', () => {
  it('renders the app title and all nav links', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Peerfect Match')
    for (const label of ['Upload', 'Configure', 'Match', 'Review', 'Export']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('shows the home screen at the index route, with a way in', () => {
    renderAt('/')
    // The wordmark renders as <em>Peer</em>fect Match; accessible-name
    // computation may inject spaces around the <em>, so match loosely.
    expect(screen.getByRole('heading', { level: 2, name: /peer\s*fect match/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/upload')
    // Both the header and the hero offer "How it works".
    expect(screen.getAllByRole('button', { name: /how it works|how this app works/i }).length)
      .toBeGreaterThanOrEqual(2)
  })

  it('renders the Dashboard screen at its route, with the Review sub-nav', () => {
    renderAt('/dashboard')
    expect(screen.getByRole('heading', { level: 2, name: /match quality/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Details' })).toHaveAttribute('href', '/details')
  })

  it('renders the Preference details screen under the Review sub-nav', () => {
    renderAt('/details')
    expect(screen.getByRole('heading', { level: 2, name: /preference details/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Details' })).toHaveAttribute('href', '/details')
  })

  it('sends unknown routes back to Upload', () => {
    renderAt('/does-not-exist')
    expect(screen.getByRole('heading', { level: 2, name: 'Upload' })).toBeInTheDocument()
  })
})
