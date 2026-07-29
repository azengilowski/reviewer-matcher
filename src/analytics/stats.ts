import { capacityForPaper, loadForReviewer } from '../domain/settings'
import type {
  Assignment,
  MatchRun,
  MatchSettings,
  Paper,
  Reviewer,
} from '../domain/types'
import { isConflict } from '../editing/validation'

export interface Pairing {
  paperId: string
  reviewerId: string
  score: number
  paperRank: number
}

export interface Bar {
  label: string
  count: number
}

export interface DashboardStats {
  assignments: number
  manual: number
  conflictOverrides: number
  unfilledPapers: number
  idleReviewers: number
  overCapPapers: number
  overLoadReviewers: number
  loadHistogram: Bar[]
  capHistogram: Bar[]
  rankHistogram: Bar[]
  meanPaperRank: number
  medianPaperRank: number
  pctTop1: number
  pctTop3: number
  best: Pairing[]
  worst: Pairing[]
}

function histogram(counts: number[]): Bar[] {
  const byValue = new Map<number, number>()
  for (const c of counts) byValue.set(c, (byValue.get(c) ?? 0) + 1)
  return [...byValue.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([value, count]) => ({ label: String(value), count }))
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function scoreOf(run: MatchRun, paperId: string, reviewerId: string): number {
  return run.paperPreferences[paperId]?.find((e) => e.targetId === reviewerId)?.score ?? 0
}

/** Compute all dashboard statistics for a set of assignments (SPEC §5.6). */
export function computeDashboard(
  reviewers: Reviewer[],
  papers: Paper[],
  settings: MatchSettings,
  run: MatchRun,
  assignments: Assignment[],
): DashboardStats {
  const perReviewer = new Map<string, number>(reviewers.map((r) => [r.id, 0]))
  const perPaper = new Map<string, number>(papers.map((p) => [p.id, 0]))
  for (const a of assignments) {
    perReviewer.set(a.reviewerId, (perReviewer.get(a.reviewerId) ?? 0) + 1)
    perPaper.set(a.paperId, (perPaper.get(a.paperId) ?? 0) + 1)
  }

  const paperRanks = assignments.map((a) => a.paperRank).filter((r) => r > 0)
  const pairings: Pairing[] = assignments.map((a) => ({
    paperId: a.paperId,
    reviewerId: a.reviewerId,
    score: scoreOf(run, a.paperId, a.reviewerId),
    paperRank: a.paperRank,
  }))
  const byScore = [...pairings].sort((a, b) => b.score - a.score)

  return {
    assignments: assignments.length,
    manual: assignments.filter((a) => a.source === 'manual').length,
    conflictOverrides: assignments.filter((a) => isConflict(run, a.paperId, a.reviewerId)).length,
    unfilledPapers: papers.filter((p) => (perPaper.get(p.id) ?? 0) < capacityForPaper(p, settings)).length,
    idleReviewers: reviewers.filter((r) => (perReviewer.get(r.id) ?? 0) === 0).length,
    overCapPapers: papers.filter((p) => (perPaper.get(p.id) ?? 0) > capacityForPaper(p, settings)).length,
    overLoadReviewers: reviewers.filter((r) => (perReviewer.get(r.id) ?? 0) > loadForReviewer(r, settings)).length,
    loadHistogram: histogram([...perReviewer.values()]),
    capHistogram: histogram([...perPaper.values()]),
    rankHistogram: histogram(paperRanks),
    meanPaperRank: paperRanks.length ? paperRanks.reduce((s, r) => s + r, 0) / paperRanks.length : 0,
    medianPaperRank: median(paperRanks),
    pctTop1: paperRanks.length ? (paperRanks.filter((r) => r === 1).length / paperRanks.length) * 100 : 0,
    pctTop3: paperRanks.length ? (paperRanks.filter((r) => r <= 3).length / paperRanks.length) * 100 : 0,
    best: byScore.slice(0, 5),
    worst: byScore.slice(-5).reverse(),
  }
}

/** Mean paper-rank of a set of assignments (used for run comparison). */
export function meanPaperRank(assignments: Assignment[]): number {
  const ranks = assignments.map((a) => a.paperRank).filter((r) => r > 0)
  return ranks.length ? ranks.reduce((s, r) => s + r, 0) / ranks.length : 0
}
