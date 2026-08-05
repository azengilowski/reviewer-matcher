import { DEFAULT_SETTINGS } from '../domain/settings'
import type { Assignment, MatchRun, Reviewer } from '../domain/types'
import { averagePaperScore, paperRoleStatus } from './validation'

const run: MatchRun = {
  settings: DEFAULT_SETTINGS,
  assignments: [],
  paperPreferences: {
    P1: [
      { targetId: 'r1', rank: 1, score: 0.9, conflict: false },
      { targetId: 'r2', rank: 2, score: 0.5, conflict: false },
    ],
  },
  reviewerPreferences: {},
  unmatchedPapers: [],
  unmatchedReviewers: [],
  stable: true,
}

describe('averagePaperScore', () => {
  it('averages the similarity of assigned reviewers', () => {
    const assignments: Assignment[] = [
      { paperId: 'P1', reviewerId: 'r1', paperRank: 1, reviewerRank: 1, source: 'auto' },
      { paperId: 'P1', reviewerId: 'r2', paperRank: 2, reviewerRank: 1, source: 'auto' },
    ]
    expect(averagePaperScore(run, assignments, 'P1')).toBeCloseTo(0.7) // (0.9 + 0.5) / 2
  })

  it('returns null for a paper with no assignments', () => {
    expect(averagePaperScore(run, [], 'P1')).toBeNull()
  })
})

describe('paperRoleStatus', () => {
  const revs = new Map<string, Reviewer>([
    ['f1', { id: 'f1', name: 'F1', role: 'professor', criteria: '' }],
    ['f2', { id: 'f2', name: 'F2', role: 'professor', criteria: '' }],
    ['s1', { id: 's1', name: 'S1', role: 'student', criteria: '' }],
  ])
  const asg = (paperId: string, reviewerId: string): Assignment => ({
    paperId,
    reviewerId,
    paperRank: 1,
    reviewerRank: 1,
    source: 'auto',
  })

  it('reports have vs min per configured role', () => {
    const settings = { ...DEFAULT_SETTINGS, roleMinimums: { professor: 3, student: 1 } }
    const rows = paperRoleStatus([asg('p1', 'f1'), asg('p1', 'f2'), asg('p1', 's1')], 'p1', revs, settings)
    expect(rows).toEqual([
      { role: 'professor', min: 3, have: 2 },
      { role: 'student', min: 1, have: 1 },
    ])
  })

  it('is empty when no minimums are configured', () => {
    expect(paperRoleStatus([asg('p1', 'f1')], 'p1', revs, DEFAULT_SETTINGS)).toEqual([])
  })
})
