import { deferredAcceptance, verifyStable } from '../engine/deferredAcceptance'
import type { Party } from '../engine/types'
import { rebalanceLoads } from './rebalance'
import { activeRoleMinimums, capacityForPaper, loadForReviewer } from '../domain/settings'
import type {
  Assignment,
  MatchRun,
  MatchSettings,
  Paper,
  PreferenceEntry,
  Reviewer,
} from '../domain/types'
import type { ProgressUpdate, SimilarityProvider } from '../similarity/types'

/** Clean text the way paper_matcher.py did: keep letters, collapse, lowercase. */
function clean(...parts: string[]): string {
  return parts
    .join(' ')
    .replace(/[^a-zA-Z]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const R = (id: string) => `R#${id}`
const P = (id: string) => `P#${id}`

/** True if the reviewer's text mentions the paper's method (e.g. "qualitative"). */
export function methodMatches(paper: Paper, reviewer: Reviewer): boolean {
  const method = clean(paper.method)
  if (!method) return false
  const crit = clean(reviewer.criteria)
  if (!crit) return false
  return method
    .split(' ')
    .filter((t) => t.length > 3)
    .some((t) => crit.includes(t))
}

/**
 * True if the reviewer's institution appears in the paper's Authors text.
 * A heuristic by necessity: papers carry affiliations only inside the free-text
 * authors column, so this is a case-insensitive substring match (short strings
 * are ignored to avoid false hits on initials).
 */
export function isInstitutionConflict(reviewer: Reviewer, paper: Paper): boolean {
  const inst = (reviewer.institution ?? '').trim().toLowerCase()
  if (inst.length < 4) return false
  return paper.authors.toLowerCase().includes(inst)
}

/** True if the reviewer's name appears among the paper's authors (self-authorship). */
export function isSelfAuthor(reviewer: Reviewer, paper: Paper): boolean {
  const name = reviewer.name.trim().toLowerCase()
  if (!name) return false
  const authors = paper.authors.toLowerCase()
  if (authors.includes(name)) return true
  // Also handle "Last, First" reviewer names vs "First Last" author lists.
  const parts = name.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 2) {
    const flipped = `${parts[1]} ${parts[0]}`
    if (authors.includes(flipped)) return true
  }
  return false
}

function rankedPreferences(
  targets: { id: string }[],
  score: (targetId: string) => number,
  isConflict: (targetId: string) => boolean,
): PreferenceEntry[] {
  const scored = targets.map((t) => ({
    targetId: t.id,
    score: score(t.id),
    conflict: isConflict(t.id),
  }))
  // Ties broken by id so ordering (and the match) is deterministic.
  scored.sort((a, b) => b.score - a.score || a.targetId.localeCompare(b.targetId))
  return scored.map((s, i) => ({ ...s, rank: i + 1 }))
}

/**
 * Full matching pipeline (SPEC §4): build similarity, rank both sides, apply
 * self-authorship conflicts, run deferred acceptance with the configured
 * proposing side, and return assignments + preference lists for the UI.
 */
export async function runMatch(
  reviewers: Reviewer[],
  papers: Paper[],
  settings: MatchSettings,
  provider: SimilarityProvider,
  onProgress?: (p: ProgressUpdate) => void,
  /** Assignments on locked papers to hold fixed (they consume reviewer load). */
  lockedAssignments: Assignment[] = [],
): Promise<MatchRun> {
  // 1. Prepare + embed all texts in one shared space (prefixed ids).
  const prepared = [
    ...reviewers.map((r) => ({ id: R(r.id), text: clean(r.criteria) })),
    ...papers.map((p) => ({ id: P(p.id), text: clean(p.title, p.abstract, p.keywords, p.method) })),
  ]
  const scorer = await provider.build(prepared, onProgress)
  const methodBoost = settings.methodBoost ?? 0
  // Pair score = embedding similarity + optional method-affinity bonus, applied
  // symmetrically so both sides rank consistently.
  const pairScore = (paper: Paper, reviewer: Reviewer): number => {
    const base = scorer.similarity(P(paper.id), R(reviewer.id))
    return methodBoost > 0 && methodMatches(paper, reviewer) ? base + methodBoost : base
  }

  // 2. Conflict predicate (self-authorship / same institution), both directions.
  const conflict = (paper: Paper, reviewer: Reviewer) =>
    (settings.excludeSelfAuthorship && isSelfAuthor(reviewer, paper)) ||
    (!!settings.excludeSameInstitution && isInstitutionConflict(reviewer, paper))

  // 3. Rank reviewers for each paper, and papers for each reviewer.
  const paperPreferences: Record<string, PreferenceEntry[]> = {}
  const reviewerById = new Map(reviewers.map((r) => [r.id, r]))
  const paperById = new Map(papers.map((p) => [p.id, p]))
  for (const paper of papers) {
    paperPreferences[paper.id] = rankedPreferences(
      reviewers,
      (reviewerId) => pairScore(paper, reviewerById.get(reviewerId)!),
      (reviewerId) => conflict(paper, reviewerById.get(reviewerId)!),
    )
  }
  const reviewerPreferences: Record<string, PreferenceEntry[]> = {}
  for (const reviewer of reviewers) {
    reviewerPreferences[reviewer.id] = rankedPreferences(
      papers,
      (paperId) => pairScore(paperById.get(paperId)!, reviewer),
      (paperId) => conflict(paperById.get(paperId)!, reviewer),
    )
  }

  // 4. Locked papers are held fixed: exclude them from matching, and pre-consume
  //    the load their reviewers use so the rest is matched around them.
  const lockedPaperIds = new Set(lockedAssignments.map((a) => a.paperId))
  const lockedLoadUsed = new Map<string, number>()
  for (const a of lockedAssignments) {
    lockedLoadUsed.set(a.reviewerId, (lockedLoadUsed.get(a.reviewerId) ?? 0) + 1)
  }

  // 5. Build Party lists (conflicts filtered out of what the engine can match).
  //    With role minimums, papers carry per-role reserves and reviewers carry
  //    their role as the engine group.
  const minimums = activeRoleMinimums(settings)
  const hasMinimums = Object.keys(minimums).length > 0
  const paperParty: Party[] = papers
    .filter((p) => !lockedPaperIds.has(p.id))
    .map((p) => ({
      id: p.id,
      capacity: capacityForPaper(p, settings),
      preferences: paperPreferences[p.id].filter((e) => !e.conflict).map((e) => e.targetId),
      ...(hasMinimums ? { reserves: minimums } : {}),
    }))
  const reviewerParty: Party[] = reviewers.map((r) => ({
    id: r.id,
    capacity: Math.max(0, loadForReviewer(r, settings) - (lockedLoadUsed.get(r.id) ?? 0)),
    preferences: reviewerPreferences[r.id].filter((e) => !e.conflict).map((e) => e.targetId),
    group: r.role,
  }))

  // 6. Run with the configured proposing side (SPEC §4.2). Reserves are only
  //    supported on the receiving side, so active role minimums force the
  //    reviewers-propose direction; both sides rank by the same symmetric
  //    score, so the direction has little practical effect on outcomes.
  const papersPropose = settings.proposingSide === 'papers' && !hasMinimums
  const proposers = papersPropose ? paperParty : reviewerParty
  const receivers = papersPropose ? reviewerParty : paperParty
  const result = deferredAcceptance(proposers, receivers, { seed: settings.seed })
  const stable = verifyStable(proposers, receivers, result).stable

  // 7. Normalize pairs to paper/reviewer assignments with display ranks.
  const rankOf = (prefs: PreferenceEntry[], targetId: string) =>
    prefs.find((e) => e.targetId === targetId)?.rank ?? 0
  const fresh: Assignment[] = result.pairs.map((pair) => {
    const paperId = papersPropose ? pair.proposerId : pair.receiverId
    const reviewerId = papersPropose ? pair.receiverId : pair.proposerId
    return {
      paperId,
      reviewerId,
      paperRank: rankOf(paperPreferences[paperId], reviewerId),
      reviewerRank: rankOf(reviewerPreferences[reviewerId], paperId),
      source: 'auto',
    }
  })

  // 8. Optional load-balancing pass (skips locked papers), then merge the locked
  //    assignments back in verbatim.
  const balanced = rebalanceLoads(
    fresh,
    reviewers,
    { paperPreferences, reviewerPreferences },
    settings.minLoad ?? 0,
    minimums,
  )
  const finalAssignments = [...lockedAssignments, ...balanced]

  const assignedPapers = new Set(finalAssignments.map((a) => a.paperId))
  const assignedReviewers = new Set(finalAssignments.map((a) => a.reviewerId))

  return {
    settings,
    assignments: finalAssignments,
    paperPreferences,
    reviewerPreferences,
    unmatchedPapers: papers.filter((p) => !assignedPapers.has(p.id)).map((p) => p.id),
    unmatchedReviewers: reviewers.filter((r) => !assignedReviewers.has(r.id)).map((r) => r.id),
    stable,
  }
}
