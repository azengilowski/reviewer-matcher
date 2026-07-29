import { DEFAULT_SETTINGS } from './settings'
import type { Paper, Reviewer } from './types'
import { computeFeasibility } from './feasibility'

const paper = (id: string, capacityOverride?: number): Paper => ({
  id,
  title: '',
  abstract: '',
  keywords: '',
  method: '',
  authors: '',
  capacityOverride,
})
const reviewer = (id: string, role: string, loadOverride?: number): Reviewer => ({
  id,
  name: id,
  role,
  criteria: '',
  loadOverride,
})

describe('computeFeasibility', () => {
  it('sums paper capacity (demand) vs reviewer load (supply)', () => {
    const f = computeFeasibility(
      [reviewer('r1', 'professor'), reviewer('r2', 'student')], // 4 + 6 = 10
      [paper('p1'), paper('p2')], // 2 + 2 = 4
      DEFAULT_SETTINGS,
    )
    expect(f.demand).toBe(4)
    expect(f.supply).toBe(10)
    expect(f.feasible).toBe(true)
  })

  it('flags infeasible when demand exceeds supply', () => {
    const f = computeFeasibility(
      [reviewer('r1', 'other', 1)], // supply 1
      [paper('p1'), paper('p2'), paper('p3')], // demand 6
      DEFAULT_SETTINGS,
    )
    expect(f.feasible).toBe(false)
  })

  it('respects per-item overrides', () => {
    const f = computeFeasibility(
      [reviewer('r1', 'student', 2)], // override 2 (not role 6)
      [paper('p1', 5)], // override capacity 5
      DEFAULT_SETTINGS,
    )
    expect(f.supply).toBe(2)
    expect(f.demand).toBe(5)
  })
})
