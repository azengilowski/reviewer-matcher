import type { Assignment, MatchRun, Paper, Reviewer } from '../domain/types'
import { parseDelimited } from './readTable'

export interface ResolutionReport {
  assignments: Assignment[]
  matchedPapers: number
  matchedReviewers: number
  /** Column headers that couldn't be matched to a known paper. */
  unresolvedPapers: string[]
  /** Cell names that couldn't be matched to a known reviewer. */
  unresolvedReviewers: string[]
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Best-effort import of a human-friendly results CSV (papers as columns,
 * reviewer names as rows — SPEC §5.8.B). Resolves column headers to paper ids
 * and cell names to reviewer ids against the currently-loaded sets, and reports
 * anything it could not resolve rather than dropping silently.
 *
 * When a run is present, assignment ranks are rehydrated from its preferences.
 */
export function importResultsCsv(
  text: string,
  reviewers: Reviewer[],
  papers: Paper[],
  run: MatchRun | null,
): ResolutionReport {
  const rows = parseDelimited(text)
  if (rows.length === 0) {
    return { assignments: [], matchedPapers: 0, matchedReviewers: 0, unresolvedPapers: [], unresolvedReviewers: [] }
  }

  const header = rows[0]
  const paperByName = new Map<string, string>()
  for (const p of papers) {
    paperByName.set(norm(p.id), p.id)
    paperByName.set(norm(`paper ${p.id}`), p.id)
    if (p.title) paperByName.set(norm(p.title), p.id)
  }
  const reviewerByName = new Map<string, string>()
  for (const r of reviewers) {
    reviewerByName.set(norm(r.name), r.id)
    reviewerByName.set(norm(r.id), r.id)
  }

  // Map each column to a paper id.
  const colToPaper: (string | null)[] = header.map((h) => paperByName.get(norm(h)) ?? null)
  const unresolvedPapers = header.filter((_, i) => colToPaper[i] === null && header[i].trim() !== '')

  const assignments: Assignment[] = []
  const matchedReviewerIds = new Set<string>()
  const matchedPaperIds = new Set<string>()
  const unresolvedReviewers = new Set<string>()

  for (let r = 1; r < rows.length; r++) {
    rows[r].forEach((cell, col) => {
      const paperId = colToPaper[col]
      const name = cell.trim()
      if (!paperId || !name) return
      const reviewerId = reviewerByName.get(norm(name))
      if (!reviewerId) {
        unresolvedReviewers.add(name)
        return
      }
      matchedReviewerIds.add(reviewerId)
      matchedPaperIds.add(paperId)
      assignments.push({
        paperId,
        reviewerId,
        paperRank: run?.paperPreferences[paperId]?.find((e) => e.targetId === reviewerId)?.rank ?? 0,
        reviewerRank: run?.reviewerPreferences[reviewerId]?.find((e) => e.targetId === paperId)?.rank ?? 0,
        source: 'manual',
      })
    })
  }

  return {
    assignments,
    matchedPapers: matchedPaperIds.size,
    matchedReviewers: matchedReviewerIds.size,
    unresolvedPapers,
    unresolvedReviewers: [...unresolvedReviewers],
  }
}
