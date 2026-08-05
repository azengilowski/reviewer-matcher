import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { keywordRunner } from '../matching/runner'
import { AppStoreProvider } from '../state/AppStore'
import { SettingsScreen } from './SettingsScreen'

function renderSettings() {
  return render(
    <AppStoreProvider runner={keywordRunner}>
      <SettingsScreen />
    </AppStoreProvider>,
  )
}

describe('SettingsScreen', () => {
  it('defaults to papers proposing and shows its advantage line', () => {
    renderSettings()
    const papers = screen.getByRole('radio', { name: /papers propose/i })
    expect(papers).toBeChecked()
    expect(screen.getByText(/papers get their most-preferred reviewers/i)).toBeInTheDocument()
  })

  it('updates the effect line when switching to reviewers proposing', async () => {
    const user = userEvent.setup()
    renderSettings()
    await user.click(screen.getByRole('radio', { name: /reviewers propose/i }))
    expect(
      screen.getByText(/each reviewer gets the best papers they can stably get/i),
    ).toBeInTheDocument()
  })

  it('reveals the proposing-side explanation on demand', async () => {
    const user = userEvent.setup()
    renderSettings()
    expect(screen.queryByText(/advantages the proposing side/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /why does this matter/i }))
    expect(screen.getByText(/advantages the proposing side/i)).toBeInTheDocument()
  })

  it('edits the default paper capacity', () => {
    renderSettings()
    const cap = screen.getByLabelText('Reviewers per paper')
    expect(cap).toHaveValue(4)
    fireEvent.change(cap, { target: { value: '3' } })
    expect(cap).toHaveValue(3)
  })

  it('allows clearing a number field, marking it invalid until refilled', () => {
    renderSettings()
    const cap = screen.getByLabelText('Reviewers per paper')
    fireEvent.change(cap, { target: { value: '' } })
    expect(cap).toHaveValue(null)
    expect(cap).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(cap, { target: { value: '5' } })
    expect(cap).toHaveValue(5)
    expect(cap).not.toHaveAttribute('aria-invalid')
  })
})
