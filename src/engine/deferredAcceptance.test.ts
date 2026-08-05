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

describe('per-group reserves (role minimums)', () => {
  // One paper (receiver, capacity 4) choosing among reviewers (proposers) who
  // all rank the paper first. Paper's own ranking: S1 > S2 > S3 > S4 > F1 > F2.
  const paper = (reserves?: Record<string, number>) => ({
    id: 'P1',
    capacity: 4,
    preferences: ['S1', 'S2', 'S3', 'S4', 'F1', 'F2'],
    reserves,
  })
  const reviewer = (id: string, group: string) => ({
    id,
    capacity: 1,
    preferences: ['P1'],
    group,
  })
  const reviewers = [
    reviewer('S1', 'student'),
    reviewer('S2', 'student'),
    reviewer('S3', 'student'),
    reviewer('S4', 'student'),
    reviewer('F1', 'professor'),
    reviewer('F2', 'professor'),
  ]

  it('without reserves the top-ranked fill all seats', () => {
    const result = deferredAcceptance(reviewers, [paper()], { seed: 't' })
    expect(result.byReceiver.get('P1')).toEqual(['S1', 'S2', 'S3', 'S4'])
  })

  it('reserved seats go to the group even when others rank higher', () => {
    const result = deferredAcceptance(reviewers, [paper({ professor: 2 })], { seed: 't' })
    const held = result.byReceiver.get('P1')!
    expect(held).toHaveLength(4)
    expect(held.filter((id) => id.startsWith('F'))).toEqual(['F1', 'F2'])
    // Open seats still go to the best students.
    expect(held.filter((id) => id.startsWith('S'))).toEqual(['S1', 'S2'])
  })

  it('an unfillable reserve reverts to open seats (never held empty)', () => {
    // Reserve 3 professor seats but only 2 professors exist.
    const result = deferredAcceptance(reviewers, [paper({ professor: 3 })], { seed: 't' })
    const held = result.byReceiver.get('P1')!
    expect(held).toHaveLength(4)
    expect(held.filter((id) => id.startsWith('F'))).toEqual(['F1', 'F2'])
    expect(held.filter((id) => id.startsWith('S'))).toEqual(['S1', 'S2'])
  })

  it('minimums summing to capacity behave as hard quotas', () => {
    const result = deferredAcceptance(
      reviewers,
      [paper({ professor: 2, student: 2 })],
      { seed: 't' },
    )
    const held = result.byReceiver.get('P1')!
    expect(held.filter((id) => id.startsWith('F'))).toEqual(['F1', 'F2'])
    expect(held.filter((id) => id.startsWith('S'))).toEqual(['S1', 'S2'])
  })

  it('a reserved-group late proposer displaces an open-seat holder, who re-proposes', () => {
    // Two papers. F1 prefers P2, so P1 first fills with students; when P2
    // rejects nobody… force the displacement: F1 lists P1 second and P2 first,
    // P2 has capacity 1 and prefers F2. F1 ends up displacing a student at P1.
    const papers = [
      { id: 'P1', capacity: 2, preferences: ['S1', 'S2', 'F1'], reserves: { professor: 1 } },
      { id: 'P2', capacity: 1, preferences: ['F2', 'F1'] },
    ]
    const revs = [
      { id: 'S1', capacity: 2, preferences: ['P1'], group: 'student' },
      { id: 'S2', capacity: 2, preferences: ['P1'], group: 'student' },
      { id: 'F1', capacity: 1, preferences: ['P2', 'P1'], group: 'professor' },
      { id: 'F2', capacity: 1, preferences: ['P2'], group: 'professor' },
    ]
    const result = deferredAcceptance(revs, papers, { seed: 't' })
    expect(result.byReceiver.get('P2')).toEqual(['F2'])
    const p1 = result.byReceiver.get('P1')!
    expect(p1).toContain('F1') // reserve honored after F1's rejection at P2
    expect(p1).toContain('S1') // best student keeps the open seat
    expect(p1).toHaveLength(2)
  })

  it('verifyStable flags a paper under its minimum as blocked by an unmatched group member', () => {
    // P1 holds only students though F1 (acceptable both ways) is unmatched.
    const papers = [
      { id: 'P1', capacity: 2, preferences: ['S1', 'S2', 'F1'], reserves: { professor: 1 } },
    ]
    const revs = [
      { id: 'S1', capacity: 1, preferences: ['P1'], group: 'student' },
      { id: 'S2', capacity: 1, preferences: ['P1'], group: 'student' },
      { id: 'F1', capacity: 1, preferences: ['P1'], group: 'professor' },
    ]
    const good = deferredAcceptance(revs, papers, { seed: 't' })
    expect(good.byReceiver.get('P1')).toContain('F1')
    expect(verifyStable(revs, papers, good).stable).toBe(true)

    // Hand-build the bad matching (both students, no professor) and check it's unstable.
    const bad = {
      ...good,
      byProposer: new Map([
        ['S1', ['P1']],
        ['S2', ['P1']],
        ['F1', []],
      ]),
      byReceiver: new Map([['P1', ['S1', 'S2']]]),
    }
    expect(verifyStable(revs, papers, bad).stable).toBe(false)
  })
})
