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
    expect(screen.getByText('Reviewer Matcher')).toBeInTheDocument()
    for (const label of ['Upload', 'Settings', 'Match', 'Review', 'Export']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('redirects the index route to the Upload screen', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 2, name: 'Upload' })).toBeInTheDocument()
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
