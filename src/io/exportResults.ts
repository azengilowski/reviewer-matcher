import Papa from 'papaparse'
import type { Assignment, Paper, Reviewer } from '../domain/types'

/**
 * Export assignments in the human-friendly results shape used by the existing
 * pipeline (`20250812results_*.csv`): one column per paper, reviewer names
 * stacked down each column, ordered by the paper's ranking of them (SPEC §6).
 */
export function exportResultsCsv(
  assignments: Assignment[],
  papers: Paper[],
  reviewers: Reviewer[],
): string {
  const nameById = new Map(reviewers.map((r) => [r.id, r.name]))

  // paperId -> reviewer names, ordered by paperRank.
  const byPaper = new Map<string, string[]>()
  for (const p of papers) byPaper.set(p.id, [])
  const sorted = [...assignments].sort((a, b) => a.paperRank - b.paperRank)
  for (const a of sorted) {
    byPaper.get(a.paperId)?.push(nameById.get(a.reviewerId) ?? a.reviewerId)
  }

  const header = papers.map((p) => `Paper ${p.id}`)
  const maxRows = Math.max(0, ...papers.map((p) => byPaper.get(p.id)!.length))
  const grid: string[][] = []
  for (let row = 0; row < maxRows; row++) {
    grid.push(papers.map((p) => byPaper.get(p.id)![row] ?? ''))
  }

  return Papa.unparse({ fields: header, data: grid })
}
