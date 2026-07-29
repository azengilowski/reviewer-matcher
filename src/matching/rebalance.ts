import type { Assignment, PreferenceEntry, Reviewer } from '../domain/types'

interface Prefs {
  paperPreferences: Record<string, PreferenceEntry[]>
  reviewerPreferences: Record<string, PreferenceEntry[]>
}

function entry(prefs: PreferenceEntry[] | undefined, targetId: string): PreferenceEntry | undefined {
  return prefs?.find((e) => e.targetId === targetId)
}

/**
 * Raise the minimum reviewer load to `minLoad` by swapping under-loaded
 * reviewers onto papers currently held by over-floor reviewers. Trades a little
 * match quality for fairness (a real goal of human panels — see the comparison).
 *
 * Greedy and bounded: for each needy reviewer, take the acceptable paper where
 * they fit best (highest similarity, non-conflict, not already on it) whose
 * current reviewer stays above the floor. Never pushes anyone below the floor.
 */
export function rebalanceLoads(
  assignments: Assignment[],
  reviewers: Reviewer[],
  prefs: Prefs,
  minLoad: number,
): Assignment[] {
  if (minLoad <= 0) return assignments

  const work = assignments.map((a) => ({ ...a }))
  const load = new Map<string, number>(reviewers.map((r) => [r.id, 0]))
  for (const a of work) load.set(a.reviewerId, (load.get(a.reviewerId) ?? 0) + 1)

  const acceptable = (paperId: string, reviewerId: string): PreferenceEntry | null => {
    const e = entry(prefs.paperPreferences[paperId], reviewerId)
    return e && !e.conflict ? e : null
  }

  const maxSwaps = reviewers.length * (minLoad + 1) * 4
  let swaps = 0

  for (;;) {
    const under = reviewers
      .filter((r) => (load.get(r.id) ?? 0) < minLoad)
      .sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0))
    if (under.length === 0) break

    let progressed = false
    for (const needy of under) {
      if ((load.get(needy.id) ?? 0) >= minLoad) continue

      let bestIndex = -1
      let bestScore = -Infinity
      for (let index = 0; index < work.length; index++) {
        const a = work[index]
        if (a.reviewerId === needy.id) continue
        if ((load.get(a.reviewerId) ?? 0) <= minLoad) continue // don't starve the victim
        if (work.some((x) => x.paperId === a.paperId && x.reviewerId === needy.id)) continue
        const e = acceptable(a.paperId, needy.id)
        if (!e) continue
        if (e.score > bestScore) {
          bestScore = e.score
          bestIndex = index
        }
      }

      if (bestIndex >= 0) {
        const victim = work[bestIndex]
        const paperId = victim.paperId
        load.set(victim.reviewerId, (load.get(victim.reviewerId) ?? 0) - 1)
        work[bestIndex] = {
          paperId,
          reviewerId: needy.id,
          paperRank: entry(prefs.paperPreferences[paperId], needy.id)?.rank ?? 0,
          reviewerRank: entry(prefs.reviewerPreferences[needy.id], paperId)?.rank ?? 0,
          source: 'auto',
        }
        load.set(needy.id, (load.get(needy.id) ?? 0) + 1)
        swaps += 1
        progressed = true
        if (swaps >= maxSwaps) return work
      }
    }
    if (!progressed) break
  }
  return work
}
