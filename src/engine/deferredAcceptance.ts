import seedrandom from 'seedrandom'
import type {
  MatchOptions,
  MatchResult,
  Party,
  Pair,
  StabilityCheck,
} from './types'

/** In-place Fisher–Yates shuffle using a seeded RNG. */
function shuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

/** Build receiverId -> (proposerId -> rank index) for O(1) preference lookups. */
function rankIndex(parties: Party[]): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>()
  for (const party of parties) {
    const m = new Map<string, number>()
    party.preferences.forEach((otherId, i) => m.set(otherId, i))
    out.set(party.id, m)
  }
  return out
}

/**
 * Many-to-many deferred acceptance (Gale–Shapley / generalized
 * Hospital–Residents), proposer-proposing. Ported from `paper_matcher.py`.
 *
 * Guarantees a **stable** matching that respects every capacity and only ever
 * pairs mutually-acceptable parties (each must appear in the other's list).
 * The proposing side is proposer-optimal (SPEC §4.2).
 *
 * A pairing occurs only when `proposer.id ∈ receiver.preferences` AND
 * `receiver.id ∈ proposer.preferences`, so conflicts/one-sided lists are
 * naturally excluded.
 */
export function deferredAcceptance(
  proposers: Party[],
  receivers: Party[],
  options: MatchOptions = {},
): MatchResult {
  const rng = seedrandom(options.seed ?? 'peerfect-match')

  const proposerById = new Map(proposers.map((p) => [p.id, p]))
  const receiverById = new Map(receivers.map((r) => [r.id, r]))
  const receiverRank = rankIndex(receivers)
  const proposerRank = rankIndex(proposers)

  // Mutable state.
  const holds = new Map<string, Set<string>>() // receiverId -> held proposerIds
  for (const r of receivers) holds.set(r.id, new Set())
  const matched = new Map<string, Set<string>>() // proposerId -> held receiverIds
  for (const p of proposers) matched.set(p.id, new Set())
  const nextIdx = new Map<string, number>() // proposerId -> next preference pointer
  for (const p of proposers) nextIdx.set(p.id, 0)

  const isActive = (p: Party): boolean =>
    matched.get(p.id)!.size < p.capacity &&
    nextIdx.get(p.id)! < p.preferences.length

  // Only proposers with capacity and a non-empty list can act (SPEC §4.2:
  // empty-preference parties are dropped from matching).
  let queue = proposers
    .filter((p) => p.capacity > 0 && p.preferences.length > 0)
    .map((p) => p.id)
  shuffle(queue, rng) // randomized order for fairness, seeded for reproducibility

  while (queue.length > 0) {
    const requeue = new Set<string>()
    for (const pid of queue) {
      const p = proposerById.get(pid)!
      // Propose down the list until at capacity or exhausted.
      while (isActive(p)) {
        const i = nextIdx.get(pid)!
        nextIdx.set(pid, i + 1)
        const rid = p.preferences[i]
        const r = receiverById.get(rid)
        if (!r) continue // preference names an unknown receiver
        const rRank = receiverRank.get(rid)!
        if (!rRank.has(pid)) continue // not mutually acceptable → skip

        // Tentatively accept.
        holds.get(rid)!.add(pid)
        matched.get(pid)!.add(rid)

        // Reject the least-preferred if now over capacity.
        if (holds.get(rid)!.size > r.capacity) {
          const held = [...holds.get(rid)!].sort(
            (a, b) => rRank.get(a)! - rRank.get(b)!,
          )
          for (const rejected of held.slice(r.capacity)) {
            holds.get(rid)!.delete(rejected)
            matched.get(rejected)!.delete(rid)
            const rp = proposerById.get(rejected)!
            if (isActive(rp)) requeue.add(rejected) // freed → may propose again
          }
        }
      }
    }
    queue = [...requeue]
  }

  return buildResult(proposers, receivers, holds, matched, proposerRank, receiverRank)
}

function buildResult(
  proposers: Party[],
  receivers: Party[],
  holds: Map<string, Set<string>>,
  matched: Map<string, Set<string>>,
  proposerRank: Map<string, Map<string, number>>,
  receiverRank: Map<string, Map<string, number>>,
): MatchResult {
  const pairs: Pair[] = []
  const byProposer = new Map<string, string[]>()
  const byReceiver = new Map<string, string[]>()

  for (const p of proposers) {
    const rids = [...matched.get(p.id)!].sort(
      (a, b) => proposerRank.get(p.id)!.get(a)! - proposerRank.get(p.id)!.get(b)!,
    )
    byProposer.set(p.id, rids)
    for (const rid of rids) {
      pairs.push({
        proposerId: p.id,
        receiverId: rid,
        proposerRank: proposerRank.get(p.id)!.get(rid)! + 1,
        receiverRank: receiverRank.get(rid)!.get(p.id)! + 1,
      })
    }
  }
  for (const r of receivers) {
    const pids = [...holds.get(r.id)!].sort(
      (a, b) => receiverRank.get(r.id)!.get(a)! - receiverRank.get(r.id)!.get(b)!,
    )
    byReceiver.set(r.id, pids)
  }

  const unmatchedProposers = proposers
    .filter((p) => matched.get(p.id)!.size === 0)
    .map((p) => p.id)
  const unmatchedReceivers = receivers
    .filter((r) => holds.get(r.id)!.size === 0)
    .map((r) => r.id)

  return { pairs, byProposer, byReceiver, unmatchedProposers, unmatchedReceivers }
}

/**
 * Verify a matching is stable: no mutually-acceptable pair both prefer each
 * other over a current partner (or an empty slot). Ported from
 * `paper_matcher.py`'s `verifyStable`, generalized to responsive capacities.
 */
export function verifyStable(
  proposers: Party[],
  receivers: Party[],
  result: MatchResult,
): StabilityCheck {
  const proposerRank = rankIndex(proposers)
  const receiverRank = rankIndex(receivers)
  const proposerCap = new Map(proposers.map((p) => [p.id, p.capacity]))
  const receiverCap = new Map(receivers.map((r) => [r.id, r.capacity]))

  for (const p of proposers) {
    const pMatches = result.byProposer.get(p.id) ?? []
    const pRank = proposerRank.get(p.id)!
    for (const r of receivers) {
      const rRank = receiverRank.get(r.id)!
      // Must be mutually acceptable to be a candidate blocking pair.
      if (!pRank.has(r.id) || !rRank.has(p.id)) continue
      if (pMatches.includes(r.id)) continue // already matched

      const pWants =
        pMatches.length < proposerCap.get(p.id)! ||
        pMatches.some((m) => pRank.get(r.id)! < pRank.get(m)!)
      if (!pWants) continue

      const rMatches = result.byReceiver.get(r.id) ?? []
      const rWants =
        rMatches.length < receiverCap.get(r.id)! ||
        rMatches.some((m) => rRank.get(p.id)! < rRank.get(m)!)
      if (rWants) return { stable: false, blockingPair: [p.id, r.id] }
    }
  }
  return { stable: true }
}
