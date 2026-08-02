import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, vi } from 'vitest'
import { keywordRunner } from '../matching/runner'
import { AppStoreProvider } from '../state/AppStore'
import { UploadScreen } from './UploadScreen'
import { MatchScreen } from './MatchScreen'
import { WorkloadScreen } from './WorkloadScreen'

const REVIEWERS_CSV = `id,name,role,specialties
r1,Math Rev,professor,mathematics cognitive load problem solving
r2,Lit Rev,student,literacy reading equity culturally responsive`

const PAPERS_CSV = `id,title,abstract,keywords,method,authors
p1,Math,cognitive load in mathematics problem solving,mathematics,Quantitative,Nobody
p2,Reading,literacy reading equity classrooms,literacy,Qualitative,Nobody`

// Shared store across Upload (to seed), Match (to run), and Workload (under test).
function renderFlow() {
  return render(
    <MemoryRouter>
      <AppStoreProvider runner={keywordRunner}>
        <UploadScreen />
        <MatchScreen />
        <WorkloadScreen />
      </AppStoreProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const body = url.includes('reviewers') ? REVIEWERS_CSV : PAPERS_CSV
      return { text: async () => body } as Response
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('WorkloadScreen', () => {
  it('shows the empty state before any match', () => {
    render(
      <MemoryRouter>
        <AppStoreProvider runner={keywordRunner}>
          <WorkloadScreen />
        </AppStoreProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText(/no match yet/i)).toBeInTheDocument()
  })

  it('lists each reviewer with their load and paper pills linking to Details', async () => {
    const user = userEvent.setup()
    renderFlow()
    await user.click(screen.getByRole('button', { name: /load sample data/i }))
    await waitFor(() => expect(screen.getByTestId('count-reviewers')).toHaveTextContent('2 loaded'))
    await user.click(screen.getByRole('button', { name: /run match/i }))
    await waitFor(() => expect(screen.getByText(/stable/i)).toBeInTheDocument())

    // Both reviewers appear as workload rows with load badges.
    const rows = document.querySelectorAll('.workload-row')
    expect(rows.length).toBe(2)
    expect(screen.getByRole('link', { name: 'Math Rev' })).toHaveAttribute(
      'href',
      '/details?mode=reviewer&id=r1',
    )
    // Every assigned paper renders as a pill deep-linking to its Details view.
    const pills = document.querySelectorAll('.workload-pill')
    expect(pills.length).toBeGreaterThan(0)
    expect([...pills].every((p) => p.getAttribute('href')?.startsWith('/details?mode=paper'))).toBe(
      true,
    )
  })

  it('filters reviewers by the search box', async () => {
    const user = userEvent.setup()
    renderFlow()
    await user.click(screen.getByRole('button', { name: /load sample data/i }))
    await waitFor(() => expect(screen.getByTestId('count-reviewers')).toHaveTextContent('2 loaded'))
    await user.click(screen.getByRole('button', { name: /run match/i }))
    await waitFor(() => expect(screen.getByText(/stable/i)).toBeInTheDocument())

    await user.type(screen.getByLabelText(/find a reviewer/i), 'Lit')
    expect(document.querySelectorAll('.workload-row').length).toBe(1)
    expect(screen.getByRole('link', { name: 'Lit Rev' })).toBeInTheDocument()
  })
})
