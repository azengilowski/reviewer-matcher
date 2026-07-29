import { DEFAULT_SETTINGS } from '../domain/settings'
import type { Assignment, MatchRun, Paper, Reviewer } from '../domain/types'
import { explainPair } from './explain'

const reviewers = new Map<string, Reviewer>([
  ['r1', { id: 'r1', name: 'R1', role: 'professor', criteria: '' }],
  ['r2', { id: 'r2', name: 'R2', role: 'professor', criteria: '' }],
  ['r3', { id: 'r3', name: 'R3', role: 'professor', criteria: '' }],
])
const papers = new Map<string, Paper>([
  ['P1', { id: 'P1', title: '', abstract: '', keywords: '', method: '', authors: '' }],
])

const run: MatchRun = {
  settings: DEFAULT_SETTINGS,
  assignments: [],
  paperPreferences: {
    P1: [
      { targetId: 'r1', rank: 1, score: 0.9, conflict: false },
      { targetId: 'r2', rank: 2, score: 0.8, conflict: false },
      { targetId: 'r3', rank: 3, score: 0.7, conflict: true },
    ],
  },
  reviewerPreferences: {
    r1: [{ targetId: 'P1', rank: 1, score: 0.9, conflict: false }],
    r2: [{ targetId: 'P1', rank: 1, score: 0.8, conflict: false }],
    r3: [{ targetId: 'P1', rank: 1, score: 0.7, conflict: true }],
  },
  unmatchedPapers: [],
  unmatchedReviewers: [],
  stable: true,
}

const settings = { ...DEFAULT_SETTINGS, paperCapacity: 1 }
const assignments: Assignment[] = [
  { paperId: 'P1', reviewerId: 'r1', paperRank: 1, reviewerRank: 1, source: 'auto' },
]

describe('explainPair', () => {
  it('marks the assigned reviewer as chosen', () => {
    expect(explainPair(run, assignments, reviewers, papers, settings, 'P1', 'r1').status).toBe('chosen')
  })

  it('flags a self-authorship conflict', () => {
    expect(explainPair(run, assignments, reviewers, papers, settings, 'P1', 'r3').status).toBe('conflict')
  })

  it('explains a non-chosen reviewer as paper-full when capacity is used', () => {
    const ex = explainPair(run, assignments, reviewers, papers, settings, 'P1', 'r2')
    expect(ex.status).toBe('paper-full')
    expect(ex.label).toMatch(/filled by higher-ranked/i)
  })
})
