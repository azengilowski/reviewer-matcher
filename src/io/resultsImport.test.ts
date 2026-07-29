import type { Paper, Reviewer } from '../domain/types'
import { importResultsCsv } from './resultsImport'

const reviewers: Reviewer[] = [
  { id: 'r1', name: 'Alvarez, Maria', role: 'professor', criteria: '' },
  { id: 'r2', name: 'Chen, Wei', role: 'professor', criteria: '' },
]
const papers: Paper[] = [
  { id: 'P1', title: 'One', abstract: '', keywords: '', method: '', authors: '' },
  { id: 'P2', title: 'Two', abstract: '', keywords: '', method: '', authors: '' },
]

describe('importResultsCsv (best-effort §5.8.B)', () => {
  it('resolves column headers to papers and cell names to reviewers', () => {
    const csv = 'Paper P1,Paper P2\n"Alvarez, Maria","Chen, Wei"\n'
    const rep = importResultsCsv(csv, reviewers, papers, null)
    expect(rep.assignments).toHaveLength(2)
    expect(rep.assignments).toContainEqual(
      expect.objectContaining({ paperId: 'P1', reviewerId: 'r1', source: 'manual' }),
    )
    expect(rep.assignments).toContainEqual(
      expect.objectContaining({ paperId: 'P2', reviewerId: 'r2' }),
    )
    expect(rep.matchedPapers).toBe(2)
  })

  it('reports unresolved reviewer names instead of dropping silently', () => {
    const csv = 'Paper P1\n"Nobody, Real"\n'
    const rep = importResultsCsv(csv, reviewers, papers, null)
    expect(rep.assignments).toHaveLength(0)
    expect(rep.unresolvedReviewers).toContain('Nobody, Real')
  })

  it('reports unresolved paper columns', () => {
    const csv = 'Paper P9\n"Alvarez, Maria"\n'
    const rep = importResultsCsv(csv, reviewers, papers, null)
    expect(rep.unresolvedPapers).toContain('Paper P9')
  })
})
