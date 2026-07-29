import { deferredAcceptance, verifyStable } from './deferredAcceptance'
import type { MatchResult, Party } from './types'

/** Sorted, plain-object view of a result's pairings for stable comparisons. */
function pairSet(result: MatchResult): string[] {
  return result.pairs
    .map((p) => `${p.proposerId}->${p.receiverId}`)
    .sort()
}

describe('deferredAcceptance — canonical 1:1 stable marriage', () => {
  // Classic men-propose example; men are proposers.
  const men: Party[] = [
    { id: 'm1', capacity: 1, preferences: ['w1', 'w2', 'w3'] },
    { id: 'm2', capacity: 1, preferences: ['w2', 'w1', 'w3'] },
    { id: 'm3', capacity: 1, preferences: ['w1', 'w2', 'w3'] },
  ]
  const women: Party[] = [
    { id: 'w1', capacity: 1, preferences: ['m1', 'm2', 'm3'] },
    { id: 'w2', capacity: 1, preferences: ['m2', 'm1', 'm3'] },
    { id: 'w3', capacity: 1, preferences: ['m1', 'm2', 'm3'] },
  ]

  it('produces the known proposer-optimal matching', () => {
    const result = deferredAcceptance(men, women)
    expect(pairSet(result)).toEqual(['m1->w1', 'm2->w2', 'm3->w3'])
  })

  it('records correct 1-based ranks on each side', () => {
    const result = deferredAcceptance(men, women)
    const m3 = result.pairs.find((p) => p.proposerId === 'm3')!
    // m3 got w3, its 3rd choice; w3 ranked m3 3rd.
    expect(m3.proposerRank).toBe(3)
    expect(m3.receiverRank).toBe(3)
  })
})

describe('deferredAcceptance — many-to-many capacities', () => {
  // Reviewers (proposers, load 1) → papers (receivers, capacity 2).
  const reviewers: Party[] = [
    { id: 'r1', capacity: 1, preferences: ['pA', 'pB'] },
    { id: 'r2', capacity: 1, preferences: ['pA', 'pB'] },
    { id: 'r3', capacity: 1, preferences: ['pB', 'pA'] },
  ]
  const papers: Party[] = [
    { id: 'pA', capacity: 2, preferences: ['r1', 'r2', 'r3'] },
    { id: 'pB', capacity: 2, preferences: ['r1', 'r2', 'r3'] },
  ]

  it('fills papers up to capacity with preferred reviewers', () => {
    const result = deferredAcceptance(reviewers, papers)
    expect(result.byReceiver.get('pA')).toEqual(['r1', 'r2'])
    expect(result.byReceiver.get('pB')).toEqual(['r3'])
  })

  it('never exceeds any capacity or load', () => {
    const result = deferredAcceptance(reviewers, papers)
    expect(result.byReceiver.get('pA')!.length).toBeLessThanOrEqual(2)
    expect(result.byReceiver.get('pB')!.length).toBeLessThanOrEqual(2)
    for (const load of result.byProposer.values()) {
      expect(load.length).toBeLessThanOrEqual(1)
    }
  })

  it('is stable', () => {
    const result = deferredAcceptance(reviewers, papers)
    expect(verifyStable(reviewers, papers, result).stable).toBe(true)
  })
})

describe('deferredAcceptance — conflicts & one-sided lists', () => {
  it('never pairs parties that are not mutually acceptable', () => {
    // r1 lists pA, but pA does NOT list r1 (e.g. r1 is an author of pA).
    const reviewers: Party[] = [
      { id: 'r1', capacity: 1, preferences: ['pA', 'pB'] },
    ]
    const papers: Party[] = [
      { id: 'pA', capacity: 2, preferences: ['r2'] }, // r1 excluded (conflict)
      { id: 'pB', capacity: 2, preferences: ['r1'] },
    ]
    const result = deferredAcceptance(reviewers, papers)
    expect(pairSet(result)).toEqual(['r1->pB'])
    expect(result.byReceiver.get('pA')).toEqual([])
  })
})

describe('deferredAcceptance — empty preferences are dropped', () => {
  it('leaves parties with empty lists unmatched', () => {
    const reviewers: Party[] = [
      { id: 'r1', capacity: 1, preferences: [] }, // submitted no rankings
      { id: 'r2', capacity: 1, preferences: ['pA'] },
    ]
    const papers: Party[] = [
      { id: 'pA', capacity: 2, preferences: ['r1', 'r2'] },
      { id: 'pB', capacity: 2, preferences: [] }, // no one ranked, ranks no one
    ]
    const result = deferredAcceptance(reviewers, papers)
    expect(pairSet(result)).toEqual(['r2->pA'])
    expect(result.unmatchedProposers).toContain('r1')
    expect(result.unmatchedReceivers).toContain('pB')
  })
})

describe('deferredAcceptance — reproducibility', () => {
  const proposers: Party[] = Array.from({ length: 12 }, (_, i) => ({
    id: `p${i}`,
    capacity: 2,
    preferences: ['a', 'b', 'c', 'd', 'e'].sort(),
  }))
  const receivers: Party[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({
    id,
    capacity: 4,
    preferences: Array.from({ length: 12 }, (_, i) => `p${i}`),
  }))

  it('yields identical results across seeds (strict preferences)', () => {
    const a = deferredAcceptance(proposers, receivers, { seed: 'one' })
    const b = deferredAcceptance(proposers, receivers, { seed: 'two' })
    expect(pairSet(a)).toEqual(pairSet(b))
  })

  it('is deterministic for a fixed seed', () => {
    const a = deferredAcceptance(proposers, receivers, { seed: 'fixed' })
    const b = deferredAcceptance(proposers, receivers, { seed: 'fixed' })
    expect(pairSet(a)).toEqual(pairSet(b))
  })
})

describe('verifyStable', () => {
  const proposers: Party[] = [
    { id: 'r1', capacity: 1, preferences: ['pA', 'pB'] },
    { id: 'r2', capacity: 1, preferences: ['pA', 'pB'] },
  ]
  const receivers: Party[] = [
    { id: 'pA', capacity: 1, preferences: ['r1', 'r2'] },
    { id: 'pB', capacity: 1, preferences: ['r1', 'r2'] },
  ]

  it('accepts the engine output as stable', () => {
    const result = deferredAcceptance(proposers, receivers)
    expect(verifyStable(proposers, receivers, result).stable).toBe(true)
  })

  it('detects a hand-made unstable matching', () => {
    // Force the worst assignment: r1->pB, r2->pA. Both r1 and pA prefer each
    // other over their partners → a blocking pair exists.
    const unstable: MatchResult = {
      pairs: [
        { proposerId: 'r1', receiverId: 'pB', proposerRank: 2, receiverRank: 1 },
        { proposerId: 'r2', receiverId: 'pA', proposerRank: 1, receiverRank: 2 },
      ],
      byProposer: new Map([
        ['r1', ['pB']],
        ['r2', ['pA']],
      ]),
      byReceiver: new Map([
        ['pA', ['r2']],
        ['pB', ['r1']],
      ]),
      unmatchedProposers: [],
      unmatchedReceivers: [],
    }
    const check = verifyStable(proposers, receivers, unstable)
    expect(check.stable).toBe(false)
    expect(check.blockingPair).toEqual(['r1', 'pA'])
  })
})
