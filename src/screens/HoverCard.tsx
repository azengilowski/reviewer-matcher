import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Paper, Reviewer } from '../domain/types'
import { fmtScore } from '../domain/format'

export type PopPos = { left: number; top: number; above: boolean }

/**
 * Shared hover-popover positioning: measures the hovered element, flips above
 * when there's no room below, clamps to the viewport. Returns handlers for
 * onMouseEnter/onMouseLeave and the position to portal a card at.
 */
export function useHoverPopover(width = 280) {
  const [pop, setPop] = useState<PopPos | null>(null)
  const showPop = (e: { currentTarget: Element }) => {
    const r = e.currentTarget.getBoundingClientRect()
    const above = window.innerHeight - r.bottom < 240
    setPop({
      left: Math.max(8, Math.min(r.left, window.innerWidth - (width + 16))),
      top: above ? r.top - 8 : r.bottom + 8,
      above,
    })
  }
  const hidePop = () => setPop(null)
  return { pop, showPop, hidePop, setPop }
}

/** The positioned, portalled card shell (portals to <body> so it never clips). */
export function HoverCardPortal({ pop, children }: { pop: PopPos; children: React.ReactNode }) {
  return createPortal(
    <div
      role="tooltip"
      className={`hover-card${pop.above ? ' hover-card--above' : ''}`}
      style={{ left: pop.left, top: pop.top }}
    >
      {children}
    </div>,
    document.body,
  )
}

/** A reviewer's uploaded details (+ optional per-paper match stats and load). */
export function ReviewerHoverBody({
  reviewer,
  score,
  rank,
  load,
}: {
  reviewer: Reviewer
  score?: number
  rank?: number
  load?: { used: number; limit: number; over: boolean }
}) {
  return (
    <>
      <strong className="hover-card__name">{reviewer.name}</strong>
      <div className="hover-card__meta">
        <span className="hover-card__cap">{reviewer.role}</span>
        {reviewer.institution && <span> · {reviewer.institution}</span>}
        <span className="muted"> · {reviewer.id}</span>
      </div>
      {(score != null || load) && (
        <div className="hover-card__stats">
          {score != null && (
            <span className="hover-card__stat">
              match <strong>{fmtScore(score)}</strong>
              {rank ? ` · #${rank} here` : ''}
            </span>
          )}
          {load && (
            <span className={`hover-card__stat${load.over ? ' hover-card__stat--over' : ''}`}>
              load <strong>{load.used}/{load.limit}</strong>
            </span>
          )}
        </div>
      )}
      {reviewer.criteria && <p className="hover-card__text">{reviewer.criteria}</p>}
    </>
  )
}

/** A paper's uploaded details: id/method, keywords, abstract, authors. */
export function PaperHoverBody({ paper }: { paper: Paper }) {
  return (
    <>
      <strong className="hover-card__name">{paper.title || paper.id}</strong>
      <div className="hover-card__meta">
        <span className="muted">{paper.id}</span>
        {paper.method && <span> · {paper.method}</span>}
      </div>
      {paper.keywords && <p className="hover-card__tags">{paper.keywords}</p>}
      {paper.abstract && <p className="hover-card__text">{paper.abstract}</p>}
      {paper.authors && <div className="hover-card__authors muted">Authors: {paper.authors}</div>}
    </>
  )
}
