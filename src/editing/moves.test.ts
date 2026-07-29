import type { Assignment, MatchRun } from '../domain/types'
import { addReviewersToPaper, computeMove } from './moves'
import { paperCapacityStatus } from './validation'
import { DEFAULT_SETTINGS } from '../domain/settings'
import type { Paper } from '../domain/types'

// Minimal run: P1 ranks r1,r2,r3 (r3 is a conflict); prefs used for ranks.
const run: MatchRun = {
  settings: DEFAULT_SETTINGS,
  assignments: [],
  paperPreferences: {
    P1: [
      { targetId: 'r1', rank: 1, score: 0.9, conflict: false },
      { targetId: 'r2', rank: 2, score: 0.8, conflict: false },
      { targetId: 'r3', rank: 3, score: 0.7, conflict: true },
    ],
    P2: [
      { targetId: 'r1', rank: 1, score: 0.6, conflict: false },
      { targetId: 'r2', rank: 2, score: 0.5, conflict: false },
    ],
  },
  reviewerPreferences: {
    r1: [
      { targetId: 'P1', rank: 1, score: 0.9, conflict: false },
      { targetId: 'P2', rank: 2, score: 0.6, conflict: false },
    ],
    r2: [{ targetId: 'P1', rank: 1, score: 0.8, conflict: false }],
    r3: [{ targetId: 'P1', rank: 1, score: 0.7, conflict: true }],
  },
  unmatchedPapers: [],
  unmatchedReviewers: [],
  stable: true,
}

const base: Assignment[] = [
  { paperId: 'P1', reviewerId: 'r1', paperRank: 1, reviewerRank: 1, source: 'auto' },
]

describe('computeMove', () => {
  it('moves a reviewer from the tray onto a paper as a manual assignment', () => {
    const result = computeMove(base, run, 'Rev 2', null, 'r2', 'P1')
    expect(result).not.toBeNull()
    if (!result || result === 'conflict') throw new Error('expected move')
    expect(result.next).toHaveLength(2)
    const added = result.next.find((a) => a.reviewerId === 'r2')!
    expect(added.source).toBe('manual')
    expect(added.paperRank).toBe(2)
  })

  it('unassigns a reviewer when dropped on the tray', () => {
    const result = computeMove(base, run, 'Rev 1', 'P1', 'r1', null)
    if (!result || result === 'conflict') throw new Error('expected move')
    expect(result.next).toHaveLength(0)
    expect(result.action).toBe('unassign')
  })

  it('blocks a self-authorship conflict unless overridden', () => {
    expect(computeMove(base, run, 'Rev 3', null, 'r3', 'P1')).toBe('conflict')
    const overridden = computeMove(base, run, 'Rev 3', null, 'r3', 'P1', {
      overrideConflict: true,
      reason: 'co-author dispute resolved',
    })
    if (!overridden || overridden === 'conflict') throw new Error('expected override')
    expect(overridden.detail).toMatch(/conflict override/i)
    expect(overridden.next.some((a) => a.reviewerId === 'r3')).toBe(true)
  })

  it('treats a no-op move (same paper / already assigned) as null', () => {
    expect(computeMove(base, run, 'Rev 1', 'P1', 'r1', 'P1')).toBeNull()
  })

  it('addReviewersToPaper adds new reviewers and skips duplicates', () => {
    // base has r1 on P1; adding r1 (dup) + r2 (new) should only add r2.
    const { next, added } = addReviewersToPaper(base, run, 'P1', ['r1', 'r2'])
    expect(added).toEqual(['r2'])
    expect(next.filter((a) => a.paperId === 'P1').map((a) => a.reviewerId).sort()).toEqual(['r1', 'r2'])
    const r2 = next.find((a) => a.reviewerId === 'r2')!
    expect(r2.source).toBe('manual')
    expect(r2.paperRank).toBe(2) // r2 is P1's #2 in the fixture
  })

  it('allows a capacity breach (surfaced as a warning, not blocked)', () => {
    const paper: Paper = { id: 'P1', title: '', abstract: '', keywords: '', method: '', authors: '' }
    // Fill P1 to capacity 2, then add a 3rd — allowed.
    let assignments = base
    const add2 = computeMove(assignments, run, 'Rev 2', null, 'r2', 'P1')
    if (!add2 || add2 === 'conflict') throw new Error('expected move')
    assignments = add2.next
    const status = paperCapacityStatus(assignments, paper, { ...DEFAULT_SETTINGS, paperCapacity: 2 })
    expect(status.used).toBe(2)
    expect(status.over).toBe(false)
    // Override the conflict on r3 to push over capacity.
    const add3 = computeMove(assignments, run, 'Rev 3', null, 'r3', 'P1', {
      overrideConflict: true,
      reason: 'x',
    })
    if (!add3 || add3 === 'conflict') throw new Error('expected move')
    const over = paperCapacityStatus(add3.next, paper, { ...DEFAULT_SETTINGS, paperCapacity: 2 })
    expect(over.used).toBe(3)
    expect(over.over).toBe(true)
  })
})
