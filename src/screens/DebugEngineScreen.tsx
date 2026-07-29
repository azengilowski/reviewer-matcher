import { useMemo } from 'react'
import { deferredAcceptance, verifyStable } from '../engine/deferredAcceptance'
import type { Party } from '../engine/types'
import { ScreenShell } from './ScreenShell'

// A small, hand-readable fixture: reviewers (proposers, load 2) matched to
// papers (receivers, capacity 2). Papers propose in the real app by default,
// but the engine is symmetric — here reviewers propose for a simple demo.
const REVIEWERS: Party[] = [
  { id: 'Ada', capacity: 2, preferences: ['NLP', 'Vision', 'Theory'] },
  { id: 'Bhavna', capacity: 2, preferences: ['Theory', 'NLP', 'Vision'] },
  { id: 'Chen', capacity: 2, preferences: ['Vision', 'NLP', 'Theory'] },
  { id: 'Diego', capacity: 2, preferences: ['NLP', 'Theory', 'Vision'] },
]
const PAPERS: Party[] = [
  { id: 'NLP', capacity: 2, preferences: ['Ada', 'Diego', 'Bhavna', 'Chen'] },
  { id: 'Vision', capacity: 2, preferences: ['Chen', 'Ada', 'Diego', 'Bhavna'] },
  { id: 'Theory', capacity: 2, preferences: ['Bhavna', 'Diego', 'Ada', 'Chen'] },
]

export function DebugEngineScreen() {
  const { result, stability } = useMemo(() => {
    const result = deferredAcceptance(REVIEWERS, PAPERS, { seed: 'demo' })
    return { result, stability: verifyStable(REVIEWERS, PAPERS, result) }
  }, [])

  return (
    <ScreenShell
      title="Engine debug"
      intro="Headless run of the deferred-acceptance engine on a small fixture (Stage 1). Reviewers propose to papers."
    >
      <p>
        Stability check:{' '}
        <strong style={{ color: stability.stable ? '#1a7f37' : '#c00' }}>
          {stability.stable ? 'STABLE ✓' : `UNSTABLE (${stability.blockingPair?.join(' / ')})`}
        </strong>
      </p>
      <table className="debug-table">
        <thead>
          <tr>
            <th>Paper</th>
            <th>Assigned reviewers (paper rank → reviewer rank)</th>
          </tr>
        </thead>
        <tbody>
          {PAPERS.map((paper) => (
            <tr key={paper.id}>
              <td>{paper.id}</td>
              <td>
                {(result.byReceiver.get(paper.id) ?? []).map((rid) => {
                  const pair = result.pairs.find(
                    (p) => p.receiverId === paper.id && p.proposerId === rid,
                  )!
                  return (
                    <span key={rid} className="debug-chip">
                      {rid}{' '}
                      <em>
                        (#{pair.receiverRank} → #{pair.proposerRank})
                      </em>
                    </span>
                  )
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScreenShell>
  )
}
