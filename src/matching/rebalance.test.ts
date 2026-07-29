import type { Assignment, PreferenceEntry, Reviewer } from '../domain/types'
import { rebalanceLoads } from './rebalance'

const reviewers: Reviewer[] = [
  { id: 'r1', name: 'R1', role: 'other', criteria: '' },
  { id: 'r2', name: 'R2', role: 'other', criteria: '' },
  { id: 'r3', name: 'R3', role: 'other', criteria: '' }, // starts idle
]

// r1 is a strong match everywhere; r3 is acceptable to P2/P3.
const paperPreferences: Record<string, PreferenceEntry[]> = {
  P1: [
    { targetId: 'r1', rank: 1, score: 0.9, conflict: false },
    { targetId: 'r3', rank: 2, score: 0.2, conflict: false },
  ],
  P2: [
    { targetId: 'r1', rank: 1, score: 0.8, conflict: false },
    { targetId: 'r3', rank: 2, score: 0.4, conflict: false },
  ],
  P3: [
    { targetId: 'r1', rank: 1, score: 0.7, conflict: false },
    { targetId: 'r3', rank: 2, score: 0.5, conflict: false },
  ],
}
const reviewerPreferences: Record<string, PreferenceEntry[]> = {
  r3: [
    { targetId: 'P3', rank: 1, score: 0.5, conflict: false },
    { targetId: 'P2', rank: 2, score: 0.4, conflict: false },
    { targetId: 'P1', rank: 3, score: 0.2, conflict: false },
  ],
}

// r1 hogs all three papers; r2/r3 idle.
const assignments: Assignment[] = [
  { paperId: 'P1', reviewerId: 'r1', paperRank: 1, reviewerRank: 1, source: 'auto' },
  { paperId: 'P2', reviewerId: 'r1', paperRank: 1, reviewerRank: 1, source: 'auto' },
  { paperId: 'P3', reviewerId: 'r1', paperRank: 1, reviewerRank: 1, source: 'auto' },
]

describe('rebalanceLoads', () => {
  it('is a no-op when minLoad is 0', () => {
    expect(rebalanceLoads(assignments, reviewers, { paperPreferences, reviewerPreferences }, 0)).toEqual(
      assignments,
    )
  })

  it('raises an idle reviewer to the floor by swapping onto their best-fit paper', () => {
    const out = rebalanceLoads(assignments, reviewers, { paperPreferences, reviewerPreferences }, 1)
    const r3Load = out.filter((a) => a.reviewerId === 'r3').length
    expect(r3Load).toBe(1)
    // r3 should land on P3, where it fits best (score 0.5).
    expect(out.find((a) => a.reviewerId === 'r3')?.paperId).toBe('P3')
    // No paper loses its only slot / gains a duplicate; still 3 assignments.
    expect(out).toHaveLength(3)
  })

  it('never pushes the victim below the floor', () => {
    // minLoad 1 but r1 has 3; after giving one to r3, r1 keeps 2 (>=1). OK.
    const out = rebalanceLoads(assignments, reviewers, { paperPreferences, reviewerPreferences }, 1)
    expect(out.filter((a) => a.reviewerId === 'r1').length).toBeGreaterThanOrEqual(1)
  })
})
