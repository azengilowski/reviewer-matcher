import type { Assignment, MatchRun } from '../domain/types'
import { isConflict, paperRankOf, reviewerRankOf } from './validation'

/**
 * Add reviewers to a paper, skipping any already assigned to it (dedup).
 * Returns the new assignments plus the ids actually added.
 */
export function addReviewersToPaper(
  assignments: Assignment[],
  run: MatchRun,
  paperId: string,
  reviewerIds: string[],
): { next: Assignment[]; added: string[] } {
  const existing = new Set(
    assignments.filter((a) => a.paperId === paperId).map((a) => a.reviewerId),
  )
  const added = reviewerIds.filter((rid) => !existing.has(rid))
  const next = [
    ...assignments,
    ...added.map((rid) => ({
      paperId,
      reviewerId: rid,
      paperRank: paperRankOf(run, paperId, rid),
      reviewerRank: reviewerRankOf(run, rid, paperId),
      source: 'manual' as const,
    })),
  ]
  return { next, added }
}

export interface MoveResult {
  next: Assignment[]
  action: string
  detail: string
}

export interface MoveOptions {
  /** Allow a self-authorship conflict to be placed (with a recorded reason). */
  overrideConflict?: boolean
  reason?: string
}

/**
 * Compute the assignments after dragging `reviewerId` from `sourcePaperId`
 * (null = the unassigned tray) to `targetPaperId` (null = unassign).
 *
 * Returns null for a no-op, the string 'conflict' when blocked by an
 * un-overridden self-authorship conflict, or the resulting MoveResult.
 * Capacity/load breaches are allowed (surfaced as warnings in the UI).
 */
export function computeMove(
  assignments: Assignment[],
  run: MatchRun,
  reviewerName: string,
  sourcePaperId: string | null,
  reviewerId: string,
  targetPaperId: string | null,
  options: MoveOptions = {},
): MoveResult | 'conflict' | null {
  if (sourcePaperId === targetPaperId) return null

  // Moving onto a paper the reviewer already reviews is a no-op.
  if (
    targetPaperId != null &&
    assignments.some((a) => a.paperId === targetPaperId && a.reviewerId === reviewerId)
  ) {
    return null
  }

  if (targetPaperId != null && isConflict(run, targetPaperId, reviewerId) && !options.overrideConflict) {
    return 'conflict'
  }

  // Remove the dragged instance from its source paper.
  let next = assignments
  if (sourcePaperId != null) {
    next = next.filter((a) => !(a.paperId === sourcePaperId && a.reviewerId === reviewerId))
  }

  if (targetPaperId == null) {
    return {
      next,
      action: 'unassign',
      detail: `Unassigned ${reviewerName} from paper ${sourcePaperId}`,
    }
  }

  next = [
    ...next,
    {
      paperId: targetPaperId,
      reviewerId,
      paperRank: paperRankOf(run, targetPaperId, reviewerId),
      reviewerRank: reviewerRankOf(run, reviewerId, targetPaperId),
      source: 'manual',
    },
  ]
  const suffix = options.overrideConflict ? ` (conflict override: ${options.reason ?? 'no reason'})` : ''
  return {
    next,
    action: 'assign',
    detail: `Assigned ${reviewerName} to paper ${targetPaperId}${suffix}`,
  }
}
