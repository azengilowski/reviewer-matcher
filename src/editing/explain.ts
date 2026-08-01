import { capacityForPaper, loadForReviewer } from '../domain/settings'
import type {
  Assignment,
  MatchRun,
  MatchSettings,
  Paper,
  Reviewer,
} from '../domain/types'
import {
  papersForReviewer,
  reviewersOnPaper,
  reviewerRankOf,
} from './validation'

export type ChoiceStatus =
  | 'chosen'
  | 'conflict'
  | 'paper-full'
  | 'reviewer-full'
  | 'not-selected'

export interface ChoiceExplanation {
  status: ChoiceStatus
  label: string
}

/**
 * Explain why a (paper, reviewer) pair was or wasn't matched, from the current
 * assignments. Heuristic but grounded in the run's preferences + capacities
 * (SPEC §5.7): chosen, conflict, paper filled by better, reviewer's load filled
 * by papers they preferred, or simply not selected.
 */
export function explainPair(
  run: MatchRun,
  assignments: Assignment[],
  reviewers: Map<string, Reviewer>,
  papers: Map<string, Paper>,
  settings: MatchSettings,
  paperId: string,
  reviewerId: string,
): ChoiceExplanation {
  const chosen = assignments.some((a) => a.paperId === paperId && a.reviewerId === reviewerId)
  if (chosen) return { status: 'chosen', label: 'Chosen' }

  const entry = run.paperPreferences[paperId]?.find((e) => e.targetId === reviewerId)
  if (entry?.conflict) return { status: 'conflict', label: 'Excluded: conflict of interest' }

  const reviewer = reviewers.get(reviewerId)
  if (reviewer) {
    const load = loadForReviewer(reviewer, settings)
    const assignedPapers = papersForReviewer(assignments, reviewerId)
    const thisRank = reviewerRankOf(run, reviewerId, paperId)
    if (
      assignedPapers.length >= load &&
      thisRank > 0 &&
      assignedPapers.every((pid) => {
        const r = reviewerRankOf(run, reviewerId, pid)
        return r > 0 && r < thisRank
      })
    ) {
      return {
        status: 'reviewer-full',
        label: "Reviewer's load filled by papers they ranked higher",
      }
    }
  }

  const paper = papers.get(paperId)
  if (paper && reviewersOnPaper(assignments, paperId).length >= capacityForPaper(paper, settings)) {
    return { status: 'paper-full', label: 'Paper filled by higher-ranked reviewers' }
  }

  return { status: 'not-selected', label: 'Not selected' }
}
