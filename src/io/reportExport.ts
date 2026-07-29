import Papa from 'papaparse'
import { explainPair } from '../editing/explain'
import type { Assignment, MatchRun, MatchSettings, Paper, Reviewer } from '../domain/types'
import { reviewerRankOf } from '../editing/validation'

/**
 * Per-paper report CSV (the human-readable version of paper_matcher.py's
 * `report()`, SPEC §6): for every paper, each ranked reviewer with score,
 * where the reviewer ranked the paper, whether chosen, and the reason.
 */
export function exportReportCsv(
  run: MatchRun,
  assignments: Assignment[],
  reviewers: Reviewer[],
  papers: Paper[],
  settings: MatchSettings,
): string {
  const reviewerMap = new Map(reviewers.map((r) => [r.id, r]))
  const paperMap = new Map(papers.map((p) => [p.id, p]))
  const rows: Record<string, string | number>[] = []

  for (const paper of papers) {
    const prefs = run.paperPreferences[paper.id] ?? []
    for (const entry of prefs) {
      const ex = explainPair(run, assignments, reviewerMap, paperMap, settings, paper.id, entry.targetId)
      rows.push({
        paper_id: paper.id,
        paper_title: paper.title,
        reviewer: reviewerMap.get(entry.targetId)?.name ?? entry.targetId,
        paper_rank_of_reviewer: entry.rank,
        similarity: entry.score.toFixed(4),
        reviewer_rank_of_paper: reviewerRankOf(run, entry.targetId, paper.id) || '',
        outcome: ex.label,
      })
    }
  }

  return Papa.unparse(rows)
}
