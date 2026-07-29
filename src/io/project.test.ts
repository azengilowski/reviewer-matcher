import { DEFAULT_SETTINGS } from '../domain/settings'
import type { MatchRun, Paper, Reviewer } from '../domain/types'
import { parseProject, serializeProject, type ProjectState } from './project'

const reviewers: Reviewer[] = [{ id: 'r1', name: 'Alice', role: 'professor', criteria: 'x' }]
const papers: Paper[] = [{ id: 'P1', title: 'T', abstract: 'a', keywords: 'k', method: 'm', authors: '' }]
const run: MatchRun = {
  settings: DEFAULT_SETTINGS,
  assignments: [{ paperId: 'P1', reviewerId: 'r1', paperRank: 1, reviewerRank: 1, source: 'auto' }],
  paperPreferences: { P1: [{ targetId: 'r1', rank: 1, score: 0.9, conflict: false }] },
  reviewerPreferences: { r1: [{ targetId: 'P1', rank: 1, score: 0.9, conflict: false }] },
  unmatchedPapers: [],
  unmatchedReviewers: [],
  stable: true,
}
const state: ProjectState = {
  reviewers,
  papers,
  settings: DEFAULT_SETTINGS,
  run,
  assignments: run.assignments,
  lockedPapers: ['P1'],
  auditLog: [{ at: 1000, action: 'assign', detail: 'x' }],
  runHistory: [],
}

describe('project round-trip', () => {
  it('serialize → parse restores identical state (lossless)', () => {
    const json = serializeProject(state)
    const result = parseProject(json)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.project.reviewers).toEqual(reviewers)
    expect(result.project.papers).toEqual(papers)
    expect(result.project.run).toEqual(run)
    expect(result.project.assignments).toEqual(run.assignments)
    expect(result.project.lockedPapers).toEqual(['P1'])
    expect(result.project.auditLog).toEqual(state.auditLog)
  })

  it('rejects a non-project file', () => {
    expect(parseProject('{"hello":1}')).toMatchObject({ ok: false })
    expect(parseProject('not json')).toMatchObject({ ok: false })
  })

  it('rejects an unsupported schema version', () => {
    const bumped = JSON.stringify({ app: 'reviewer-matcher', schemaVersion: 999, reviewers, papers, settings: DEFAULT_SETTINGS })
    const result = parseProject(bumped)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/version/i)
  })
})
