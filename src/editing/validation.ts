import { activeRoleMinimums, capacityForPaper, loadForReviewer } from '../domain/settings'
import type {
  Assignment,
  MatchRun,
  MatchSettings,
  Paper,
  Reviewer,
} from '../domain/types'

/** Is (paper, reviewer) a self-authorship conflict, per the run's preferences? */
export function isConflict(run: MatchRun, paperId: string, reviewerId: string): boolean {
  const entry = run.paperPreferences[paperId]?.find((e) => e.targetId === reviewerId)
  return entry?.conflict ?? false
}

/** Reviewers currently assigned to a paper. */
export function reviewersOnPaper(assignments: Assignment[], paperId: string): string[] {
  return assignments.filter((a) => a.paperId === paperId).map((a) => a.reviewerId)
}

/** Papers currently assigned to a reviewer. */
export function papersForReviewer(assignments: Assignment[], reviewerId: string): string[] {
  return assignments.filter((a) => a.reviewerId === reviewerId).map((a) => a.paperId)
}

export interface CapacityStatus {
  used: number
  limit: number
  over: boolean
}

export function paperCapacityStatus(
  assignments: Assignment[],
  paper: Paper,
  settings: MatchSettings,
): CapacityStatus {
  const used = reviewersOnPaper(assignments, paper.id).length
  const limit = capacityForPaper(paper, settings)
  return { used, limit, over: used > limit }
}

export function reviewerLoadStatus(
  assignments: Assignment[],
  reviewer: Reviewer,
  settings: MatchSettings,
): CapacityStatus {
  const used = papersForReviewer(assignments, reviewer.id).length
  const limit = loadForReviewer(reviewer, settings)
  return { used, limit, over: used > limit }
}

/**
 * Average similarity of a paper's currently-assigned reviewers — an at-a-glance
 * "how well does this paper's panel match" score (null when empty).
 */
export function averagePaperScore(
  run: MatchRun,
  assignments: Assignment[],
  paperId: string,
): number | null {
  const scoreById = new Map(
    (run.paperPreferences[paperId] ?? []).map((e) => [e.targetId, e.score]),
  )
  const scores = assignments
    .filter((a) => a.paperId === paperId)
    .map((a) => scoreById.get(a.reviewerId) ?? 0)
  if (scores.length === 0) return null
  return scores.reduce((sum, s) => sum + s, 0) / scores.length
}

/**
 * Per-role status of a paper's panel against the configured role minimums:
 * one entry per role with a minimum, with how many seats it actually holds.
 */
export function paperRoleStatus(
  assignments: Assignment[],
  paperId: string,
  reviewers: Map<string, Reviewer>,
  settings: MatchSettings,
): { role: string; min: number; have: number }[] {
  const minimums = activeRoleMinimums(settings)
  const roles = Object.keys(minimums).sort()
  if (roles.length === 0) return []
  const counts = new Map<string, number>()
  for (const a of assignments) {
    if (a.paperId !== paperId) continue
    const role = reviewers.get(a.reviewerId)?.role
    if (role) counts.set(role, (counts.get(role) ?? 0) + 1)
  }
  return roles.map((role) => ({ role, min: minimums[role], have: counts.get(role) ?? 0 }))
}

/** Rank of a reviewer within a paper's preference list (0 if absent). */
export function paperRankOf(run: MatchRun, paperId: string, reviewerId: string): number {
  return run.paperPreferences[paperId]?.find((e) => e.targetId === reviewerId)?.rank ?? 0
}
export function reviewerRankOf(run: MatchRun, reviewerId: string, paperId: string): number {
  return run.reviewerPreferences[reviewerId]?.find((e) => e.targetId === paperId)?.rank ?? 0
}
