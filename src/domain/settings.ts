import { DEFAULT_MODEL } from '../similarity/models'
import type { MatchSettings, Reviewer, Paper } from './types'

/** Default settings (paper capacity 4, papers propose). */
export const DEFAULT_SETTINGS: MatchSettings = {
  paperCapacity: 4,
  loadsByRole: { student: 2, professor: 4, other: 4 },
  defaultLoad: 4,
  proposingSide: 'papers',
  seed: 'peerfect-match',
  excludeSelfAuthorship: true,
  excludeSameInstitution: false,
  weakThreshold: 0.4,
  methodBoost: 0,
  minLoad: 0,
  embeddingModel: DEFAULT_MODEL,
}

/** Resolve a reviewer's load: per-reviewer override, else role load, else default. */
export function loadForReviewer(reviewer: Reviewer, settings: MatchSettings): number {
  if (reviewer.loadOverride != null) return reviewer.loadOverride
  return settings.loadsByRole[reviewer.role] ?? settings.defaultLoad
}

/** Resolve a paper's capacity: per-paper override, else the global default. */
export function capacityForPaper(paper: Paper, settings: MatchSettings): number {
  return paper.capacityOverride ?? settings.paperCapacity
}
