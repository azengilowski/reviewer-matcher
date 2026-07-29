/** Core domain model shared across the app (SPEC §6). */

/** Free-form role string; loads are configured per role (SPEC §4.3). */
export type Role = string

export interface Reviewer {
  id: string
  name: string
  role: Role
  /** Combined matching text: specialties, methods, prior publications. */
  criteria: string
  institution?: string
  /** Per-reviewer load override; falls back to the role load when undefined. */
  loadOverride?: number
}

export interface Paper {
  id: string
  title: string
  abstract: string
  keywords: string
  method: string
  /** Raw authors string (used for self-authorship conflict detection). */
  authors: string
  /** Per-paper capacity override; falls back to the global default. */
  capacityOverride?: number
}

export interface MatchSettings {
  /** Reviewers needed per paper (SPEC §4.3, default 2). */
  paperCapacity: number
  /** Max papers per reviewer, keyed by role. */
  loadsByRole: Record<string, number>
  /** Load used for a role not present in loadsByRole. */
  defaultLoad: number
  /** Which side proposes — determines who is advantaged (SPEC §4.2–4.3). */
  proposingSide: 'papers' | 'reviewers'
  /** Reproducibility seed (SPEC §8). */
  seed: string
  /** Exclude reviewers from papers they authored (SPEC §4.3). */
  excludeSelfAuthorship: boolean
  /** Score bonus [0..1] when a reviewer's text matches the paper's method. */
  methodBoost: number
  /** Enforce a minimum number of papers per reviewer after matching (0 = off). */
  minLoad: number
  /** transformers.js model id used for embeddings (see similarity/models). */
  embeddingModel: string
}

/** One entry in a ranked preference list, kept for the detail view (SPEC §5.7). */
export interface PreferenceEntry {
  targetId: string
  /** 1-based rank in the full similarity-ordered list (conflicts included). */
  rank: number
  /** Similarity score in [0, 1]. */
  score: number
  /** True when this pairing is a conflict (never matched). */
  conflict: boolean
}

export type AssignmentSource = 'auto' | 'manual'

export interface Assignment {
  paperId: string
  reviewerId: string
  /** Where the reviewer sits in the paper's ranking (1-based). */
  paperRank: number
  /** Where the paper sits in the reviewer's ranking (1-based). */
  reviewerRank: number
  source: AssignmentSource
}

/** One entry in the edit history (SPEC §5.5). */
export interface AuditEntry {
  /** Epoch ms when the change was made. */
  at: number
  action: string
  detail: string
}

/** A compact summary of a completed run, for cross-run comparison (SPEC §5.6). */
export interface RunSummary {
  at: number
  paperCapacity: number
  proposingSide: 'papers' | 'reviewers'
  seed: string
  assignments: number
  meanPaperRank: number
  unfilledPapers: number
  stable: boolean
}

export interface MatchRun {
  settings: MatchSettings
  assignments: Assignment[]
  /** paperId -> reviewers ranked (all, with conflict flags). */
  paperPreferences: Record<string, PreferenceEntry[]>
  /** reviewerId -> papers ranked. */
  reviewerPreferences: Record<string, PreferenceEntry[]>
  unmatchedPapers: string[]
  unmatchedReviewers: string[]
  stable: boolean
}
