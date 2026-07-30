import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { addReviewersToPaper, computeMove } from '../editing/moves'
import {
  averagePaperScore,
  paperCapacityStatus,
  papersForReviewer,
  reviewerLoadStatus,
} from '../editing/validation'
import type { Assignment, MatchRun, Reviewer } from '../domain/types'
import { useApp } from '../state/AppStore'

const UNASSIGNED = 'unassigned'

/** Encode/decode a draggable id as "sourcePaperId::reviewerId". */
const dragId = (source: string, reviewerId: string) => `${source}::${reviewerId}`
function parseDrag(id: string): { source: string; reviewerId: string } {
  const idx = id.indexOf('::')
  return { source: id.slice(0, idx), reviewerId: id.slice(idx + 2) }
}

type PaperFilter = 'all' | 'unlocked' | 'locked'
type SortKey = 'id' | 'score' | 'reviewers'
type SortDir = 'asc' | 'desc'

export function BoardView({ run }: { run: MatchRun }) {
  const {
    reviewers,
    papers,
    settings,
    assignments,
    lockedPapers,
    auditLog,
    commitAssignments,
    undo,
    redo,
    canUndo,
    canRedo,
    toggleLock,
  } = useApp()
  const nameById = useMemo(() => new Map(reviewers.map((r) => [r.id, r.name])), [reviewers])
  const lockedSet = useMemo(() => new Set(lockedPapers), [lockedPapers])
  const [filter, setFilter] = useState<PaperFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('id')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const reviewerMatches = (reviewerId: string) =>
    q !== '' && (nameById.get(reviewerId) ?? '').toLowerCase().includes(q)

  const visiblePapers = useMemo(() => {
    const filtered = papers.filter((p) => {
      // Lock filter.
      if (filter === 'locked' && !lockedSet.has(p.id)) return false
      if (filter === 'unlocked' && lockedSet.has(p.id)) return false
      // Search: paper id/title, or an assigned reviewer's name (finds all
      // papers a given reviewer is on — handy for auditing their load).
      if (q) {
        const inPaper = p.id.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)
        const inReviewer = assignments.some(
          (a) => a.paperId === p.id && (nameById.get(a.reviewerId) ?? '').toLowerCase().includes(q),
        )
        if (!inPaper && !inReviewer) return false
      }
      return true
    })
    const withMeta = filtered.map((p) => ({
      p,
      score: averagePaperScore(run, assignments, p.id) ?? -1, // empty papers sort as worst score
      count: assignments.filter((a) => a.paperId === p.id).length,
    }))
    withMeta.sort((a, b) => {
      let cmp: number
      if (sortKey === 'score') cmp = a.score - b.score
      else if (sortKey === 'reviewers') cmp = a.count - b.count
      else cmp = a.p.id.localeCompare(b.p.id, undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return withMeta.map((m) => m.p)
  }, [papers, filter, lockedSet, sortKey, sortDir, run, assignments, q, nameById])
  // MouseSensor + TouchSensor in addition to PointerSensor so drag works across
  // input types (and synthetic mouse events in automated checks).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor), // accessible keyboard drag (Space to lift, arrows, Space to drop)
  )

  const idleReviewers = useMemo(
    () => reviewers.filter((r) => papersForReviewer(assignments, r.id).length === 0),
    [reviewers, assignments],
  )

  // Name shown in the floating drag preview that follows the cursor.
  const [activeName, setActiveName] = useState<string | null>(null)

  // Transient toast explaining why a drop was rejected.
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  function showToast(message: string) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  function onDragStart(event: DragStartEvent) {
    const { reviewerId } = parseDrag(String(event.active.id))
    setActiveName(nameById.get(reviewerId) ?? reviewerId)
  }

  // Paper whose "Add reviewers" picker is open (null = closed).
  const [addingPaperId, setAddingPaperId] = useState<string | null>(null)

  function removeAssignment(paperId: string, reviewerId: string) {
    if (lockedSet.has(paperId)) return
    const name = nameById.get(reviewerId) ?? reviewerId
    const result = computeMove(assignments, run, name, paperId, reviewerId, null)
    if (result && result !== 'conflict') commitAssignments(result.next, result.action, result.detail)
  }

  function addReviewers(paperId: string, reviewerIds: string[]) {
    if (lockedSet.has(paperId)) return
    const { next, added } = addReviewersToPaper(assignments, run, paperId, reviewerIds)
    if (added.length > 0) {
      const names = added.map((rid) => nameById.get(rid) ?? rid).join(', ')
      commitAssignments(next, 'add', `Added ${names} to paper ${paperId}`)
    }
    setAddingPaperId(null)
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveName(null)
    if (!event.over) return
    const { source, reviewerId } = parseDrag(String(event.active.id))
    const target = String(event.over.id)
    const sourcePaperId = source === UNASSIGNED ? null : source
    const targetPaperId = target === UNASSIGNED ? null : target
    const name = nameById.get(reviewerId) ?? reviewerId

    // Explain the common rejections with a toast (checked before the same-paper
    // no-op, so dropping a reviewer back onto a paper they're on still explains it).
    if (targetPaperId && lockedSet.has(targetPaperId)) {
      showToast(`Paper ${targetPaperId} is locked — unlock it to change its reviewers.`)
      return
    }
    if (
      targetPaperId &&
      assignments.some((a) => a.paperId === targetPaperId && a.reviewerId === reviewerId)
    ) {
      showToast(`${name} is already assigned to paper ${targetPaperId}.`)
      return
    }

    // Otherwise nothing to do (e.g. dropped back in the tray it came from).
    if (sourcePaperId === targetPaperId) return

    const result = computeMove(assignments, run, name, sourcePaperId, reviewerId, targetPaperId)
    if (result === 'conflict') {
      showToast(
        `${name} can't be added to paper ${targetPaperId} — they're an author of it (self-authorship conflict).`,
      )
      return
    }
    if (result) commitAssignments(result.next, result.action, result.detail)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveName(null)}
    >
      <div className="board-toolbar">
        <input
          className="board-search"
          type="search"
          placeholder="Find paper or reviewer…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Find paper or reviewer"
          title="Filter the board by paper id, title, or an assigned reviewer's name"
        />
        <button
          className="btn btn--ghost btn--sm"
          onClick={undo}
          disabled={!canUndo}
          title="Undo the last edit"
        >
          ↶ Undo
        </button>
        <button
          className="btn btn--ghost btn--sm"
          onClick={redo}
          disabled={!canRedo}
          title="Redo the last undone edit"
        >
          ↷ Redo
        </button>
        <div className="board-toolbar__right">
          <div className="control">
            <label className="control__label" htmlFor="sort-key">
              Sort
            </label>
            <select
              id="sort-key"
              className="select"
              title="Sort papers by paper number, average match score, or reviewer count"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="id">Paper #</option>
              <option value="score">Match score</option>
              <option value="reviewers">Reviewers</option>
            </select>
            <button
              className="iconbtn"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              aria-label={`Sort ${sortDir === 'asc' ? 'ascending' : 'descending'}, click to reverse`}
              title={
                sortDir === 'asc'
                  ? 'Ascending order — click for descending'
                  : 'Descending order — click for ascending'
              }
            >
              <SortArrow dir={sortDir} />
            </button>
          </div>
          <div className="control">
            <label className="control__label" htmlFor="paper-filter">
              Filter
            </label>
            <select
              id="paper-filter"
              className="select"
              title="Show all papers, hide locked ones, or show only locked ones"
              value={filter}
              onChange={(e) => setFilter(e.target.value as PaperFilter)}
            >
              <option value="all">All papers ({papers.length})</option>
              <option value="unlocked">Hide locked ({papers.length - lockedSet.size})</option>
              <option value="locked">Only locked ({lockedSet.size})</option>
            </select>
          </div>
        </div>
      </div>

      <div className="board-meta">
        {auditLog.length > 0 ? (
          <details className="audit">
            <summary>Edit history ({auditLog.length})</summary>
            <ul>
              {auditLog.slice(0, 30).map((e, i) => (
                <li key={i}>
                  <time>{new Date(e.at).toLocaleTimeString()}</time> — {e.detail}
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <span />
        )}
        <div
          className="score-legend"
          title="The colored number on each paper is the average match score of its assigned reviewers"
        >
          <span className="muted">Match score</span>
          <span className="score-legend__item">
            <i className="dot dot--good" /> strong ≥0.55
          </span>
          <span className="score-legend__item">
            <i className="dot dot--ok" /> fair ≥0.40
          </span>
          <span className="score-legend__item">
            <i className="dot dot--weak" /> weak &lt;0.40
          </span>
        </div>
      </div>

      <div className="board-layout">
        <div className="board">
        {visiblePapers.length === 0 && (
          <p className="board-empty">
            No papers match {query ? `"${query}"` : 'this filter'}.
          </p>
        )}
        {visiblePapers.map((paper) => {
          const status = paperCapacityStatus(assignments, paper, settings)
          const assigned = assignments.filter((a) => a.paperId === paper.id)
          const locked = lockedSet.has(paper.id)
          const score = averagePaperScore(run, assignments, paper.id)
          return (
            <Column key={paper.id} id={paper.id} over={status.over} locked={locked}>
              <div className="col__head">
                <span className="col__idwrap">
                  <Link
                    className="col__id"
                    to={`/details?mode=paper&id=${encodeURIComponent(paper.id)}`}
                    title={`Paper ${paper.id} — ${paper.title}. Click to see its ranked reviewers.`}
                  >
                    {paper.id}
                  </Link>
                  {score != null && (
                    <span
                      className={`col__score col__score--${scoreTier(score)}`}
                      title={`Average match score of the ${assigned.length} assigned reviewer(s): ${score.toFixed(2)} on a 0–1 scale (higher is a stronger topical match)`}
                    >
                      {score.toFixed(2)}
                    </span>
                  )}
                </span>
                <span className="col__head-actions">
                  <button
                    className={locked ? 'col__lock col__lock--on' : 'col__lock'}
                    onClick={() => toggleLock(paper.id)}
                    aria-label={locked ? `Unlock ${paper.id}` : `Lock ${paper.id}`}
                    title={
                      locked
                        ? 'Locked — protected from edits and preserved on re-run. Click to unlock.'
                        : 'Lock this paper to protect its assignments from edits and re-runs.'
                    }
                  >
                    <LockIcon locked={locked} />
                  </button>
                  {!locked && (
                    <button
                      className="col__add"
                      onClick={() => setAddingPaperId(paper.id)}
                      aria-label={`Add reviewers to ${paper.id}`}
                      title="Add reviewers from this paper's ranked list"
                    >
                      + Add
                    </button>
                  )}
                  <span
                    className={status.over ? 'cap cap--over' : 'cap'}
                    title={
                      status.over
                        ? `Over capacity: ${status.used} reviewers assigned, ${status.limit} wanted`
                        : `${status.used} of ${status.limit} reviewers assigned`
                    }
                  >
                    {status.used}/{status.limit}
                  </span>
                </span>
              </div>
              <div className="col__title">{paper.title}</div>
              {assigned.map((a) => (
                <Card
                  key={a.reviewerId}
                  source={paper.id}
                  reviewerId={a.reviewerId}
                  name={nameById.get(a.reviewerId) ?? a.reviewerId}
                  rank={a.paperRank}
                  score={
                    run.paperPreferences[paper.id]?.find((e) => e.targetId === a.reviewerId)?.score
                  }
                  manual={a.source === 'manual'}
                  locked={locked}
                  highlight={reviewerMatches(a.reviewerId)}
                  onRemove={locked ? undefined : () => removeAssignment(paper.id, a.reviewerId)}
                />
              ))}
              {assigned.length === 0 && <div className="col__empty">— empty —</div>}
            </Column>
          )
        })}

        </div>
        <aside className="board-tray">
          <Column id={UNASSIGNED} tray>
            <div className="col__head">
              <strong>Unassigned</strong>
              <span className="cap">{idleReviewers.length}</span>
            </div>
            {idleReviewers.map((r) => (
              <Card
                key={r.id}
                source={UNASSIGNED}
                reviewerId={r.id}
                name={r.name}
                highlight={reviewerMatches(r.id)}
              />
            ))}
            {idleReviewers.length === 0 && <div className="col__empty">— none —</div>}
          </Column>
        </aside>
      </div>

      {/* Over-load callout for reviewers exceeding their load anywhere. */}
      <OverloadNotice run={run} />

      {/* Floating clone that follows the cursor during a drag. */}
      <DragOverlay>
        {activeName ? (
          <div className="card card--overlay">
            <span className="card__name">{activeName}</span>
          </div>
        ) : null}
      </DragOverlay>

      {addingPaperId && (
        <AddReviewersModal
          paperId={addingPaperId}
          run={run}
          reviewers={reviewers}
          assignments={assignments}
          onClose={() => setAddingPaperId(null)}
          onAdd={(ids) => addReviewers(addingPaperId, ids)}
        />
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </DndContext>
  )
}

function AddReviewersModal({
  paperId,
  run,
  reviewers,
  assignments,
  onClose,
  onAdd,
}: {
  paperId: string
  run: MatchRun
  reviewers: Reviewer[]
  assignments: Assignment[]
  onClose: () => void
  onAdd: (reviewerIds: string[]) => void
}) {
  const nameById = useMemo(() => new Map(reviewers.map((r) => [r.id, r.name])), [reviewers])
  const prefs = run.paperPreferences[paperId] ?? []
  const assigned = useMemo(
    () => new Set(assignments.filter((a) => a.paperId === paperId).map((a) => a.reviewerId)),
    [assignments, paperId],
  )
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Add reviewers to paper ${paperId}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <strong>Add reviewers to {paperId}</strong>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="modal__hint">Ranked by match. Already-assigned and conflicting reviewers can't be re-added.</p>
        <div className="modal__list">
          {prefs.map((e) => {
            const isAssigned = assigned.has(e.targetId)
            const disabled = isAssigned || e.conflict
            return (
              <label key={e.targetId} className={disabled ? 'pick pick--disabled' : 'pick'}>
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={selected.has(e.targetId)}
                  onChange={() => toggle(e.targetId)}
                />
                <span className="pick__rank">#{e.rank}</span>
                <span className="pick__name">{nameById.get(e.targetId) ?? e.targetId}</span>
                <span className="pick__score">{e.score.toFixed(3)}</span>
                {isAssigned && <span className="pick__tag">on paper</span>}
                {e.conflict && <span className="pick__tag pick__tag--warn">conflict</span>}
              </label>
            )
          })}
        </div>
        <div className="modal__foot">
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={selected.size === 0} onClick={() => onAdd([...selected])}>
            Add {selected.size > 0 ? selected.size : ''} reviewer{selected.size === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  )
}

function OverloadNotice({ run: _run }: { run: MatchRun }) {
  const { reviewers, settings, assignments } = useApp()
  const over = reviewers
    .map((r) => ({ r, s: reviewerLoadStatus(assignments, r, settings) }))
    .filter((x) => x.s.over)
  if (over.length === 0) return null
  return (
    <p className="board-overload">
      ⚠️ Over load:{' '}
      {over.map(({ r, s }) => `${r.name} (${s.used}/${s.limit})`).join(', ')}
    </p>
  )
}

/** Up arrow (ascending); rotates 180° for descending. */
function SortArrow({ dir }: { dir: SortDir }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: dir === 'desc' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
      aria-hidden="true"
    >
      <line x1="12" y1="20" x2="12" y2="5" />
      <polyline points="6 11 12 5 18 11" />
    </svg>
  )
}

/** Coarse quality tier for the paper's average match score (colors the chip). */
function scoreTier(score: number): 'good' | 'ok' | 'weak' {
  if (score >= 0.55) return 'good'
  if (score >= 0.4) return 'ok'
  return 'weak'
}

/** Flat padlock icon whose shackle is open (unlocked) or closed (locked). */
function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      {locked ? (
        // Closed shackle: arch comes down both sides into the body.
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      ) : (
        // Open shackle: arch lifts up and off to one side.
        <path d="M8 11V7a4 4 0 0 1 7.5-2" />
      )}
    </svg>
  )
}

function Column({
  id,
  children,
  over,
  tray,
  locked,
}: {
  id: string
  children: React.ReactNode
  over?: boolean
  tray?: boolean
  locked?: boolean
}) {
  // Locked columns still register the drop (so we can explain the rejection),
  // but show a "blocked" cue rather than the accepting highlight.
  const { setNodeRef, isOver } = useDroppable({ id })
  const cls = ['col']
  if (tray) cls.push('col--tray')
  if (locked) cls.push('col--locked')
  if (over) cls.push('col--overcap')
  if (isOver) cls.push(locked ? 'col--dropping-blocked' : 'col--dropping')
  return (
    <div ref={setNodeRef} className={cls.join(' ')}>
      {children}
    </div>
  )
}

function Card({
  source,
  reviewerId,
  name,
  rank,
  score,
  manual,
  locked,
  highlight,
  onRemove,
}: {
  source: string
  reviewerId: string
  name: string
  rank?: number
  score?: number
  manual?: boolean
  locked?: boolean
  highlight?: boolean
  onRemove?: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId(source, reviewerId),
    disabled: locked,
  })
  const title =
    score != null
      ? `${name} — match score ${score.toFixed(3)}${rank ? `, this paper's #${rank} choice` : ''}`
      : name
  return (
    <div
      ref={setNodeRef}
      title={title}
      className={`card${isDragging ? ' card--dragging' : ''}${manual ? ' card--manual' : ''}${locked ? ' card--locked' : ''}${highlight ? ' card--match' : ''}`}
      {...listeners}
      {...attributes}
    >
      <span className="card__name">{name}</span>
      {manual && <span className="card__manual" title="Manually assigned">✎</span>}
      {rank != null && rank > 0 && <span className="card__rank">#{rank}</span>}
      {onRemove && (
        <button
          className="card__remove"
          aria-label={`Remove ${name}`}
          title="Remove from paper"
          // Stop the drag sensors from activating when interacting with the button.
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
