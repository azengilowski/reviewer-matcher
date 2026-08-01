import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Reviewer } from '../domain/types'
import { buildReviewers, REVIEWER_FIELDS } from '../io/mapping'
import { AddEntityModal } from './AddEntityModal'

function renderModal(existingIds: string[], onAdd = vi.fn(), onClose = vi.fn()) {
  render(
    <AddEntityModal<Reviewer>
      noun="reviewer"
      fields={REVIEWER_FIELDS}
      existingIds={existingIds}
      idPrefix="R"
      build={buildReviewers}
      onAdd={onAdd}
      onClose={onClose}
    />,
  )
  return { onAdd, onClose }
}

describe('AddEntityModal', () => {
  it('auto-suggests the next free id from the existing ones', () => {
    renderModal(['R1', 'R2', 'R7'])
    expect(screen.getByLabelText('ID')).toHaveValue('R8')
  })

  it('rejects a duplicate id and does not call onAdd', async () => {
    const user = userEvent.setup()
    const { onAdd } = renderModal(['R1'])
    const id = screen.getByLabelText('ID')
    await user.clear(id)
    await user.type(id, 'R1')
    await user.click(screen.getByRole('button', { name: 'Add reviewer' }))
    expect(screen.getByText(/already in use/i)).toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('builds and returns a reviewer via the shared builder', async () => {
    const user = userEvent.setup()
    const { onAdd } = renderModal([])
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace')
    await user.type(screen.getByLabelText('Specialties / criteria'), 'computing; analysis')
    await user.click(screen.getByRole('button', { name: 'Add reviewer' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    const added = onAdd.mock.calls[0][0] as Reviewer
    expect(added).toMatchObject({ id: 'R1', name: 'Ada Lovelace' })
    expect(added.criteria).toContain('computing')
  })

  it('requires an id', async () => {
    const user = userEvent.setup()
    const { onAdd } = renderModal([])
    const id = screen.getByLabelText('ID')
    await user.clear(id)
    await user.click(screen.getByRole('button', { name: 'Add reviewer' }))
    expect(screen.getByText(/id is required/i)).toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
  })
})
