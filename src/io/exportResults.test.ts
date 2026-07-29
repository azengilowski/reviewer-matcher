import Papa from 'papaparse'
import type { Assignment, Paper, Reviewer } from '../domain/types'
import { exportResultsCsv } from './exportResults'

const reviewers: Reviewer[] = [
  { id: 'r1', name: 'Alice', role: 'professor', criteria: '' },
  { id: 'r2', name: 'Bob', role: 'student', criteria: '' },
  { id: 'r3', name: 'Cara', role: 'student', criteria: '' },
]
const papers: Paper[] = [
  { id: 'P1', title: 'One', abstract: '', keywords: '', method: '', authors: '' },
  { id: 'P2', title: 'Two', abstract: '', keywords: '', method: '', authors: '' },
]

const assignments: Assignment[] = [
  { paperId: 'P1', reviewerId: 'r1', paperRank: 1, reviewerRank: 1, source: 'auto' },
  { paperId: 'P1', reviewerId: 'r2', paperRank: 2, reviewerRank: 1, source: 'auto' },
  { paperId: 'P2', reviewerId: 'r3', paperRank: 1, reviewerRank: 1, source: 'auto' },
]

describe('exportResultsCsv', () => {
  it('produces one column per paper with reviewer names ordered by paper rank', () => {
    const csv = exportResultsCsv(assignments, papers, reviewers)
    const parsed = Papa.parse<string[]>(csv.trim(), { header: false })
    expect(parsed.data[0]).toEqual(['Paper P1', 'Paper P2'])
    // Row 1: P1's top reviewer (Alice), P2's top (Cara).
    expect(parsed.data[1]).toEqual(['Alice', 'Cara'])
    // Row 2: P1's second reviewer (Bob), P2 empty.
    expect(parsed.data[2]).toEqual(['Bob', ''])
  })
})
