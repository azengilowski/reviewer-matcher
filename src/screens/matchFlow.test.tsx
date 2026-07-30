import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, vi } from 'vitest'
import { keywordRunner } from '../matching/runner'
import { AppStoreProvider } from '../state/AppStore'
import { UploadScreen } from './UploadScreen'
import { MatchScreen } from './MatchScreen'

const REVIEWERS_CSV = `id,name,role,specialties
r1,Math Rev,professor,mathematics cognitive load problem solving
r2,Lit Rev,student,literacy reading equity culturally responsive`

const PAPERS_CSV = `id,title,abstract,keywords,method,authors
p1,Math,cognitive load in mathematics problem solving,mathematics,Quantitative,Nobody
p2,Reading,literacy reading equity classrooms,literacy,Qualitative,Nobody`

// Render Upload + Match under one shared store so state flows between them.
function renderFlow() {
  return render(
    <MemoryRouter>
      <AppStoreProvider runner={keywordRunner}>
        <UploadScreen />
        <MatchScreen />
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

describe('upload → run → results thread', () => {
  it('loads data, runs the match, and shows assignments', async () => {
    const user = userEvent.setup()
    renderFlow()

    await user.click(screen.getByRole('button', { name: /load sample data/i }))
    await waitFor(() => expect(screen.getByTestId('count-reviewers')).toHaveTextContent('2 loaded'))
    expect(screen.getByTestId('count-papers')).toHaveTextContent('2 loaded')

    await user.click(screen.getByRole('button', { name: /run match/i }))

    // Results appear with a stable match and an assignments tally.
    await waitFor(() => expect(screen.getByText(/stable/i)).toBeInTheDocument())
    expect(screen.getByText(/\d+ assignments/i)).toBeInTheDocument()

    // The math paper's board column should list the math reviewer.
    const mathColumn = screen.getByRole('link', { name: 'p1' }).closest('.col')!
    expect(mathColumn).toHaveTextContent('Math Rev')
  })
})
