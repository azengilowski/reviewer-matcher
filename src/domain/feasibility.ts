import { capacityForPaper, loadForReviewer } from './settings'
import type { MatchSettings, Paper, Reviewer } from './types'

export interface Feasibility {
  /** Total reviewer slots papers need (Σ paper capacity). */
  demand: number
  /** Total review slots reviewers can supply (Σ reviewer load). */
  supply: number
  /** True when supply can cover demand. */
  feasible: boolean
}

/** Compare total paper capacity against total reviewer load (SPEC §5.3). */
export function computeFeasibility(
  reviewers: Reviewer[],
  papers: Paper[],
  settings: MatchSettings,
): Feasibility {
  const demand = papers.reduce((sum, p) => sum + capacityForPaper(p, settings), 0)
  const supply = reviewers.reduce((sum, r) => sum + loadForReviewer(r, settings), 0)
  return { demand, supply, feasible: supply >= demand }
}
