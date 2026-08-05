/**
 * Generic many-to-many stable-matching types.
 *
 * The engine is intentionally domain-agnostic: it knows only "proposers" and
 * "receivers", each with a capacity and an ordered preference list of the other
 * side's ids. The caller decides which real-world entity (papers or reviewers)
 * plays which role — that choice is exactly the "which side proposes" setting
 * (SPEC §4.3), and it determines who is advantaged (SPEC §4.2).
 */

export interface Party {
  /** Stable unique id. */
  id: string
  /** Ordered ids of the OTHER side, most-preferred first. Conflicts must
   *  already be removed upstream (a forbidden pairing simply isn't listed). */
  preferences: string[]
  /** Max partners this party can hold (paper capacity or reviewer load). */
  capacity: number
  /** Optional group label (e.g. a reviewer's role), read by receivers' reserves. */
  group?: string
  /**
   * Receiver-side only: minimum seats reserved per proposer group ("at least
   * 3 professors"). Soft in the minority-reserve sense: while candidates of a
   * group exist they are guaranteed up to that many seats even when others
   * score higher, but a reserve that can't be filled reverts to an open seat
   * for the best remaining candidates — seats are never held empty.
   */
  reserves?: Record<string, number>
}

export interface Pair {
  proposerId: string
  receiverId: string
  /** 1-based rank of the receiver in the proposer's preference list. */
  proposerRank: number
  /** 1-based rank of the proposer in the receiver's preference list. */
  receiverRank: number
}

export interface MatchResult {
  pairs: Pair[]
  /** proposerId -> matched receiverIds, ordered by the proposer's preference. */
  byProposer: Map<string, string[]>
  /** receiverId -> matched proposerIds, ordered by the receiver's preference. */
  byReceiver: Map<string, string[]>
  /** Proposers that ended with no match (or were dropped for empty prefs). */
  unmatchedProposers: string[]
  /** Receivers that ended with no match. */
  unmatchedReceivers: string[]
}

export interface MatchOptions {
  /** Seed for the fairness shuffle, so runs are reproducible (SPEC §8). */
  seed?: string
}

export interface StabilityCheck {
  stable: boolean
  /** First [proposerId, receiverId] pair that blocks stability, if any. */
  blockingPair?: [string, string]
}
