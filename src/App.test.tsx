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

  it('renders the Dashboard screen at its route', () => {
    renderAt('/dashboard')
    expect(screen.getByRole('heading', { level: 2, name: /match quality/i })).toBeInTheDocument()
  })

  it('sends unknown routes back to Upload', () => {
    renderAt('/does-not-exist')
    expect(screen.getByRole('heading', { level: 2, name: 'Upload' })).toBeInTheDocument()
  })
})
