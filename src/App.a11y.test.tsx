import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe, toHaveNoViolations } from 'jest-axe'
import { App } from './App'

expect.extend(toHaveNoViolations)

describe('accessibility', () => {
  it('the Upload screen has no WCAG A/AA violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/upload']}>
        <App />
      </MemoryRouter>,
    )
    const results = await axe(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    })
    expect(results).toHaveNoViolations()
  })
})
