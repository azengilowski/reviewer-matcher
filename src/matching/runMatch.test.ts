import { DEFAULT_SETTINGS } from '../domain/settings'
import type { Paper, Reviewer } from '../domain/types'
import { keywordProvider } from '../similarity/keywordProvider'
import { isSelfAuthor, methodMatches, runMatch } from './runMatch'

const reviewers: Reviewer[] = [
  { id: 'r1', name: 'Math Rev', role: 'professor', criteria: 'mathematics cognitive load problem solving' },
  { id: 'r2', name: 'Lit Rev', role: 'student', criteria: 'literacy reading equity culturally responsive' },
]
const papers: Paper[] = [
  { id: 'p1', title: 'Math', abstract: 'cognitive load in mathematics problem solving', keywords: 'mathematics', method: 'Quantitative', authors: 'Nobody' },
  { id: 'p2', title: 'Reading', abstract: 'literacy reading equity classrooms', keywords: 'literacy', method: 'Qualitative', authors: 'Nobody' },
]

describe('isSelfAuthor', () => {
  it('matches "Last, First" reviewer names against "First Last" author strings', () => {
    const r: Reviewer = { id: 'x', name: 'Chen, Wei', role: 'professor', criteria: '' }
    const p: Paper = { id: 'p', title: '', abstract: '', keywords: '', method: '', authors: 'Wei Chen, State University' }
    expect(isSelfAuthor(r, p)).toBe(true)
  })
  it('does not flag unrelated names', () => {
    const r: Reviewer = { id: 'x', name: 'Alvarez, Maria', role: 'professor', criteria: '' }
    const p: Paper = { id: 'p', title: '', abstract: '', keywords: '', method: '', authors: 'Wei Chen' }
    expect(isSelfAuthor(r, p)).toBe(false)
  })
})

describe('methodMatches', () => {
  it('detects a reviewer whose text mentions the paper method', () => {
    const p: Paper = { id: 'p', title: '', abstract: '', keywords: '', method: 'Qualitative', authors: '' }
    const r: Reviewer = { id: 'r', name: 'R', role: 'other', criteria: 'qualitative case study; ethnography' }
    expect(methodMatches(p, r)).toBe(true)
  })
  it('is false when methods do not overlap', () => {
    const p: Paper = { id: 'p', title: '', abstract: '', keywords: '', method: 'Quantitative', authors: '' }
    const r: Reviewer = { id: 'r', name: 'R', role: 'other', criteria: 'qualitative interviews' }
    expect(methodMatches(p, r)).toBe(false)
  })
})

describe('runMatch method boost', () => {
  it('promotes a method-matching reviewer when boost is applied', async () => {
    const paps: Paper[] = [
      { id: 'p1', title: 'Study', abstract: 'learning in classrooms', keywords: 'learning', method: 'Qualitative', authors: 'x' },
    ]
    const revs: Reviewer[] = [
      { id: 'topic', name: 'Topic Rev', role: 'other', criteria: 'learning classrooms students' },
      { id: 'method', name: 'Method Rev', role: 'other', criteria: 'learning qualitative ethnography' },
    ]
    const base = await runMatch(revs, paps, { ...DEFAULT_SETTINGS, paperCapacity: 1, methodBoost: 0 }, keywordProvider)
    const boosted = await runMatch(revs, paps, { ...DEFAULT_SETTINGS, paperCapacity: 1, methodBoost: 0.3 }, keywordProvider)
    const boostedPick = boosted.assignments.find((a) => a.paperId === 'p1')?.reviewerId
    // With a large boost the method-matching reviewer should win p1.
    expect(boostedPick).toBe('method')
    expect(base.assignments.length).toBeGreaterThan(0)
  })
})

describe('runMatch', () => {
  it('assigns reviewers to the papers they best match', async () => {
    const run = await runMatch(reviewers, papers, DEFAULT_SETTINGS, keywordProvider)
    const forP1 = run.assignments.filter((a) => a.paperId === 'p1').map((a) => a.reviewerId)
    const forP2 = run.assignments.filter((a) => a.paperId === 'p2').map((a) => a.reviewerId)
    expect(forP1).toContain('r1')
    expect(forP2).toContain('r2')
    expect(run.stable).toBe(true)
  })

  it('respects paper capacity', async () => {
    const run = await runMatch(reviewers, papers, { ...DEFAULT_SETTINGS, paperCapacity: 1 }, keywordProvider)
    for (const p of papers) {
      const n = run.assignments.filter((a) => a.paperId === p.id).length
      expect(n).toBeLessThanOrEqual(1)
    }
  })

  it('excludes a self-authoring reviewer from their own paper', async () => {
    const author: Reviewer = {
      id: 'r3',
      name: 'Chen, Wei',
      role: 'professor',
      criteria: 'cognitive load mathematics problem solving', // strong match to p1
    }
    const p1WithAuthor: Paper = { ...papers[0], authors: 'Wei Chen, State University' }
    const run = await runMatch(
      [...reviewers, author],
      [p1WithAuthor, papers[1]],
      { ...DEFAULT_SETTINGS, paperCapacity: 1 },
      keywordProvider,
    )
    const p1Reviewers = run.assignments.filter((a) => a.paperId === 'p1').map((a) => a.reviewerId)
    expect(p1Reviewers).not.toContain('r3')
    // And the conflict is recorded in the preference list for the detail view.
    const entry = run.paperPreferences['p1'].find((e) => e.targetId === 'r3')
    expect(entry?.conflict).toBe(true)
  })

  it('preserves locked papers verbatim and matches the rest around them', async () => {
    const paps: Paper[] = [
      { id: 'p1', title: 'Math', abstract: 'cognitive load mathematics', keywords: 'mathematics', method: 'Quantitative', authors: 'Nobody' },
      { id: 'p2', title: 'Reading', abstract: 'literacy reading equity', keywords: 'literacy', method: 'Qualitative', authors: 'Nobody' },
    ]
    // Lock p1 with a deliberately "wrong" reviewer (r2, the literacy one).
    const locked = [
      { paperId: 'p1', reviewerId: 'r2', paperRank: 2, reviewerRank: 2, source: 'manual' as const },
    ]
    const run = await runMatch(
      reviewers,
      paps,
      { ...DEFAULT_SETTINGS, paperCapacity: 1, loadsByRole: { professor: 1, student: 1, other: 1 } },
      keywordProvider,
      undefined,
      locked,
    )
    // p1 keeps its locked assignment exactly.
    expect(run.assignments.filter((a) => a.paperId === 'p1')).toEqual(locked)
    // r2's single load is consumed by the lock, so p2 must get r1 (not r2).
    const p2 = run.assignments.filter((a) => a.paperId === 'p2').map((a) => a.reviewerId)
    expect(p2).toEqual(['r1'])
  })

  it('produces a valid match regardless of proposing side', async () => {
    const asPapers = await runMatch(reviewers, papers, { ...DEFAULT_SETTINGS, proposingSide: 'papers' }, keywordProvider)
    const asReviewers = await runMatch(reviewers, papers, { ...DEFAULT_SETTINGS, proposingSide: 'reviewers' }, keywordProvider)
    expect(asPapers.stable).toBe(true)
    expect(asReviewers.stable).toBe(true)
  })
})

describe('runMatch role minimums', () => {
  // One paper about literacy; the two students are much better topical matches,
  // but the professors are guaranteed their reserved seats.
  const paps: Paper[] = [
    { id: 'p1', title: 'Reading', abstract: 'literacy reading equity classrooms', keywords: 'literacy reading', method: '', authors: 'Nobody' },
  ]
  const revs: Reviewer[] = [
    { id: 's1', name: 'Stud One', role: 'student', criteria: 'literacy reading equity classrooms' },
    { id: 's2', name: 'Stud Two', role: 'student', criteria: 'literacy reading classrooms' },
    { id: 'f1', name: 'Prof One', role: 'professor', criteria: 'mathematics cognition' },
    { id: 'f2', name: 'Prof Two', role: 'professor', criteria: 'science inquiry' },
  ]
  const roleOf = new Map(revs.map((r) => [r.id, r.role]))

  it('guarantees the minimum professors even when students score higher', async () => {
    const run = await runMatch(
      revs,
      paps,
      { ...DEFAULT_SETTINGS, paperCapacity: 3, roleMinimums: { professor: 2 } },
      keywordProvider,
    )
    const held = run.assignments.filter((a) => a.paperId === 'p1').map((a) => a.reviewerId)
    expect(held).toHaveLength(3)
    expect(held.filter((id) => roleOf.get(id) === 'professor')).toHaveLength(2)
    expect(held).toContain('s1') // the best student takes the open seat
  })

  it('fills with best available when the reserved role runs short', async () => {
    const run = await runMatch(
      revs,
      paps,
      { ...DEFAULT_SETTINGS, paperCapacity: 3, roleMinimums: { professor: 3 } },
      keywordProvider,
    )
    const held = run.assignments.filter((a) => a.paperId === 'p1').map((a) => a.reviewerId)
    // Only 2 professors exist: both seated, third seat reverts to the best student.
    expect(held).toHaveLength(3)
    expect(held.filter((id) => roleOf.get(id) === 'professor')).toHaveLength(2)
    expect(held.filter((id) => roleOf.get(id) === 'student')).toHaveLength(1)
  })

  it('with no minimums the best matches win regardless of role', async () => {
    const run = await runMatch(
      revs,
      paps,
      { ...DEFAULT_SETTINGS, paperCapacity: 2, roleMinimums: {} },
      keywordProvider,
    )
    const held = run.assignments.filter((a) => a.paperId === 'p1').map((a) => a.reviewerId)
    expect(held.sort()).toEqual(['s1', 's2'])
  })
})
