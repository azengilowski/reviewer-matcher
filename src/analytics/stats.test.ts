import { DEFAULT_SETTINGS } from '../domain/settings'
import type { Assignment, MatchRun, Paper, Reviewer } from '../domain/types'
import { computeDashboard, meanPaperRank } from './stats'

const reviewers: Reviewer[] = [
  { id: 'r1', name: 'R1', role: 'professor', criteria: '' },
  { id: 'r2', name: 'R2', role: 'professor', criteria: '' },
  { id: 'r3', name: 'R3', role: 'professor', criteria: '' },
]
const papers: Paper[] = [
  { id: 'P1', title: '', abstract: '', keywords: '', method: '', authors: '' },
  { id: 'P2', title: '', abstract: '', keywords: '', method: '', authors: '' },
]
const run: MatchRun = {
  settings: DEFAULT_SETTINGS,
  assignments: [],
  paperPreferences: {
    P1: [
      { targetId: 'r1', rank: 1, score: 0.9, conflict: false },
      { targetId: 'r2', rank: 2, score: 0.5, conflict: false },
    ],
    P2: [{ targetId: 'r3', rank: 1, score: 0.8, conflict: false }],
  },
  reviewerPreferences: {},
  unmatchedPapers: [],
  unmatchedReviewers: [],
  stable: true,
}
const settings = { ...DEFAULT_SETTINGS, paperCapacity: 2 }
const assignments: Assignment[] = [
  { paperId: 'P1', reviewerId: 'r1', paperRank: 1, reviewerRank: 1, source: 'auto' },
  { paperId: 'P1', reviewerId: 'r2', paperRank: 2, reviewerRank: 1, source: 'auto' },
  { paperId: 'P2', reviewerId: 'r3', paperRank: 1, reviewerRank: 1, source: 'auto' },
]

describe('computeDashboard', () => {
  const stats = computeDashboard(reviewers, papers, settings, run, assignments)

  it('counts assignments and preference satisfaction', () => {
    expect(stats.assignments).toBe(3)
    // paperRanks = [1,2,1] → two of three are #1.
    expect(Math.round(stats.pctTop1)).toBe(67)
    expect(stats.pctTop3).toBe(100)
    expect(stats.meanPaperRank).toBeCloseTo(4 / 3)
  })

  it('flags P2 as unfilled (capacity 2, one reviewer)', () => {
    expect(stats.unfilledPapers).toBe(1)
  })

  it('ranks best and worst pairings by similarity', () => {
    expect(stats.best[0].score).toBeCloseTo(0.9)
    expect(stats.worst[0].score).toBeCloseTo(0.5)
  })

  it('builds a reviewers-per-paper histogram', () => {
    // P1 has 2 reviewers, P2 has 1 → one paper with 1, one with 2.
    expect(stats.capHistogram).toEqual([
      { label: '1', count: 1 },
      { label: '2', count: 1 },
    ])
  })
})

describe('meanPaperRank', () => {
  it('averages positive paper ranks', () => {
    expect(meanPaperRank(assignments)).toBeCloseTo(4 / 3)
  })
})
