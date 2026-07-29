import { DEFAULT_SETTINGS } from '../domain/settings'
import type { Assignment, MatchRun } from '../domain/types'
import { averagePaperScore } from './validation'

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
