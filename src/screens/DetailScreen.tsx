import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { explainPair, type ChoiceStatus } from '../editing/explain'
import {
  paperCapacityStatus,
  reviewerLoadStatus,
  reviewerRankOf,
} from '../editing/validation'
import type { Paper, Reviewer } from '../domain/types'
import { fmtScore } from '../domain/format'
import { useApp } from '../state/AppStore'
import { EmptyState } from './EmptyState'
import { HoverCardPortal, PaperHoverBody, ReviewerHoverBody, useHoverPopover } from './HoverCard'
import { ReviewSubnav } from './ReviewSubnav'
import { ScreenShell } from './ScreenShell'

type Mode = 'paper' | 'reviewer'

const STATUS_CLASS: Record<ChoiceStatus, string> = {
  chosen: 'pref-status pref-status--chosen',
  conflict: 'pref-status pref-status--conflict',
  'paper-full': 'pref-status',
  'reviewer-full': 'pref-status',
  'not-selected': 'pref-status',
}

export function DetailScreen() {
  const { reviewers, papers, settings, run, assignments } = useApp()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<Mode>((searchParams.get('mode') as Mode) || 'paper')
  const [selectedId, setSelectedId] = useState<string>(searchParams.get('id') || '')
  const [pickerQuery, setPickerQuery] = useState('')

  // React to deep links (e.g. clicking a paper on the board → ?mode=paper&id=…).
  useEffect(() => {
    const m = searchParams.get('mode')
    const id = searchParams.get('id')
    if (m === 'paper' || m === 'reviewer') setMode(m)
    if (id) setSelectedId(id)
  }, [searchParams])

  const reviewerMap = useMemo(() => new Map(reviewers.map((r) => [r.id, r])), [reviewers])
  const paperMap = useMemo(() => new Map(papers.map((p) => [p.id, p])), [papers])

  if (!run) {
    return (
      <ScreenShell
        title="Preference details"
        intro="Run a match first to see ranked preferences."
        nav={<ReviewSubnav />}
      >
        <EmptyState
          art="charts"
          text="No match yet. Run one to see every ranked preference explained."
          ctaTo="/match"
          ctaLabel="Go to Match"
        />
      </ScreenShell>
    )
  }

  const allOptions = mode === 'paper' ? papers : reviewers
  const currentId = selectedId || allOptions[0]?.id || ''
  const labelFor = (id: string) => {
    if (mode !== 'paper') return reviewerMap.get(id)?.name ?? id
    const title = paperMap.get(id)?.title ?? ''
    // Keep the option short; the summary card below shows the full details.
    return `${id}: ${title.length > 40 ? `${title.slice(0, 40)}…` : title}`
  }
  const pq = pickerQuery.trim().toLowerCase()
  const matches = (id: string) => {
    if (!pq) return true
    if (mode === 'paper') {
      const p = paperMap.get(id)
      return id.toLowerCase().includes(pq) || (p?.title ?? '').toLowerCase().includes(pq)
    }
    const r = reviewerMap.get(id)
    return (r?.name ?? '').toLowerCase().includes(pq) || id.toLowerCase().includes(pq)
  }
  let filteredOptions = allOptions.filter((o) => matches(o.id))
  // Keep the current selection pickable even when the search excludes it.
  if (currentId && !filteredOptions.some((o) => o.id === currentId)) {
    const cur = allOptions.find((o) => o.id === currentId)
    if (cur) filteredOptions = [cur, ...filteredOptions]
  }

  return (
    <ScreenShell
      title="Preference details"
      intro="For any paper or reviewer, see the full ranked list, the chosen pair, and why each option was or wasn't matched."
      nav={<ReviewSubnav />}
    >
      <div className="detail-controls">
        <div className="detail-tabs">
          <button
            className={mode === 'paper' ? 'tab tab--on' : 'tab'}
            onClick={() => {
              setMode('paper')
              setSelectedId('')
              setPickerQuery('')
            }}
          >
            By paper
          </button>
          <button
            className={mode === 'reviewer' ? 'tab tab--on' : 'tab'}
            onClick={() => {
              setMode('reviewer')
              setSelectedId('')
              setPickerQuery('')
            }}
          >
            By reviewer
          </button>
        </div>
        <input
          className="board-search"
          type="search"
          placeholder={`Search ${mode === 'paper' ? 'papers' : 'reviewers'}…`}
          value={pickerQuery}
          onChange={(e) => setPickerQuery(e.target.value)}
          aria-label={`Search ${mode === 'paper' ? 'papers' : 'reviewers'}`}
        />
        <select
          aria-label={`Select ${mode}`}
          value={currentId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {filteredOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {labelFor(o.id)}
            </option>
          ))}
        </select>
      </div>

      {mode === 'paper' ? (
        <>
          {paperMap.get(currentId) && (
            <PaperSummary
              paper={paperMap.get(currentId)!}
              used={assignments.filter((a) => a.paperId === currentId).length}
              limit={paperCapacityStatus(assignments, paperMap.get(currentId)!, settings).limit}
            />
          )}
          <PaperDetail
            paperId={currentId}
            reviewerMap={reviewerMap}
            paperMap={paperMap}
            settings={settings}
            run={run}
            assignments={assignments}
          />
        </>
      ) : (
        <>
          {reviewerMap.get(currentId) && (
            <ReviewerSummary
              reviewer={reviewerMap.get(currentId)!}
              load={reviewerLoadStatus(assignments, reviewerMap.get(currentId)!, settings)}
            />
          )}
          <ReviewerDetail
            reviewerId={currentId}
            reviewerMap={reviewerMap}
            paperMap={paperMap}
            settings={settings}
            run={run}
            assignments={assignments}
          />
        </>
      )}
    </ScreenShell>
  )
}

/** Summary card for the selected paper: the uploaded details, up front. */
function PaperSummary({ paper, used, limit }: { paper: Paper; used: number; limit: number }) {
  return (
    <section className="entity-card">
      <div className="entity-card__head">
        <strong className="entity-card__title">{paper.title || paper.id}</strong>
        <span className={`badge${used < limit ? ' badge--warn' : ''}`} title="Assigned reviewers vs capacity">
          {used}/{limit} reviewers
        </span>
      </div>
      <div className="entity-card__meta">
        <span className="muted">{paper.id}</span>
        {paper.method && <span> · {paper.method}</span>}
        {paper.keywords && <span className="entity-card__tags"> · {paper.keywords}</span>}
      </div>
      {paper.abstract && <p className="entity-card__text">{paper.abstract}</p>}
      {paper.authors && <div className="entity-card__foot muted">Authors: {paper.authors}</div>}
    </section>
  )
}

/** Summary card for the selected reviewer: the uploaded details, up front. */
function ReviewerSummary({
  reviewer,
  load,
}: {
  reviewer: Reviewer
  load: { used: number; limit: number; over: boolean }
}) {
  return (
    <section className="entity-card">
      <div className="entity-card__head">
        <strong className="entity-card__title">{reviewer.name}</strong>
        <span className={`badge${load.over ? ' badge--warn' : ''}`} title="Assigned papers vs load limit">
          {load.used}/{load.limit} papers
        </span>
      </div>
      <div className="entity-card__meta">
        <span className="entity-card__cap">{reviewer.role}</span>
        {reviewer.institution && <span> · {reviewer.institution}</span>}
        <span className="muted"> · {reviewer.id}</span>
      </div>
      {reviewer.criteria && <p className="entity-card__text">{reviewer.criteria}</p>}
    </section>
  )
}

/** Wraps a table cell's content with a hover card. */
function HoverCell({ body, children }: { body: React.ReactNode; children: React.ReactNode }) {
  const { pop, showPop, hidePop } = useHoverPopover(300)
  return (
    <span
      className="hover-target"
      tabIndex={0}
      onMouseEnter={showPop}
      onMouseLeave={hidePop}
      onFocus={showPop}
      onBlur={hidePop}
    >
      {children}
      {pop && <HoverCardPortal pop={pop}>{body}</HoverCardPortal>}
    </span>
  )
}

type SharedProps = {
  reviewerMap: Map<string, import('../domain/types').Reviewer>
  paperMap: Map<string, import('../domain/types').Paper>
  settings: import('../domain/types').MatchSettings
  run: import('../domain/types').MatchRun
  assignments: import('../domain/types').Assignment[]
}

function PaperDetail({ paperId, reviewerMap, paperMap, settings, run, assignments }: SharedProps & { paperId: string }) {
  const prefs = run.paperPreferences[paperId] ?? []
  return (
    <table className="pref-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Reviewer</th>
          <th>Score</th>
          <th>They ranked this paper</th>
          <th>Outcome</th>
        </tr>
      </thead>
      <tbody>
        {prefs.map((e) => {
          const ex = explainPair(run, assignments, reviewerMap, paperMap, settings, paperId, e.targetId)
          const rev = reviewerMap.get(e.targetId)
          return (
            <tr key={e.targetId} className={ex.status === 'chosen' ? 'pref-row--chosen' : undefined}>
              <td>{e.rank}</td>
              <td>
                {rev ? (
                  <HoverCell
                    body={
                      <ReviewerHoverBody
                        reviewer={rev}
                        score={e.score}
                        rank={e.rank}
                        load={reviewerLoadStatus(assignments, rev, settings)}
                      />
                    }
                  >
                    {rev.name}
                  </HoverCell>
                ) : (
                  e.targetId
                )}
              </td>
              <td>{fmtScore(e.score, 3)}</td>
              <td>{rankLabel(reviewerRankOf(run, e.targetId, paperId))}</td>
              <td>
                <span className={STATUS_CLASS[ex.status]}>{ex.label}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function ReviewerDetail({ reviewerId, reviewerMap, paperMap, settings, run, assignments }: SharedProps & { reviewerId: string }) {
  const prefs = run.reviewerPreferences[reviewerId] ?? []
  return (
    <table className="pref-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Paper</th>
          <th>Score</th>
          <th>Paper ranked them</th>
          <th>Outcome</th>
        </tr>
      </thead>
      <tbody>
        {prefs.map((e) => {
          const ex = explainPair(run, assignments, reviewerMap, paperMap, settings, e.targetId, reviewerId)
          const paperRank = run.paperPreferences[e.targetId]?.find((x) => x.targetId === reviewerId)?.rank ?? 0
          const pap = paperMap.get(e.targetId)
          return (
            <tr key={e.targetId} className={ex.status === 'chosen' ? 'pref-row--chosen' : undefined}>
              <td>{e.rank}</td>
              <td>
                {pap ? (
                  <HoverCell body={<PaperHoverBody paper={pap} />}>
                    {pap.title?.slice(0, 40) || pap.id}
                  </HoverCell>
                ) : (
                  e.targetId
                )}
              </td>
              <td>{fmtScore(e.score, 3)}</td>
              <td>{rankLabel(paperRank)}</td>
              <td>
                <span className={STATUS_CLASS[ex.status]}>{ex.label}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function rankLabel(rank: number): string {
  return rank > 0 ? `#${rank}` : 'n/a'
}
