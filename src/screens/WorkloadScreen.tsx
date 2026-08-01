import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { averagePaperScore, papersForReviewer, reviewerLoadStatus } from '../editing/validation'
import { fmtScore } from '../domain/format'
import { useApp } from '../state/AppStore'
import { EmptyState } from './EmptyState'
import { ReviewSubnav } from './ReviewSubnav'
import { ScreenShell } from './ScreenShell'

type SortKey = 'load' | 'name'

/**
 * Per-reviewer workload: how many papers each reviewer holds vs their limit,
 * with the assigned papers as pills linking to the Details view. The natural
 * companion to the Overview's "Needs attention" — here you see every reviewer.
 */
export function WorkloadScreen() {
  const { reviewers, papers, settings, run, assignments } = useApp()
  const [sort, setSort] = useState<SortKey>('load')
  const [query, setQuery] = useState('')

  const paperById = useMemo(() => new Map(papers.map((p) => [p.id, p])), [papers])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const built = reviewers.map((r) => {
      const load = reviewerLoadStatus(assignments, r, settings)
      const paperIds = papersForReviewer(assignments, r.id)
      return { r, load, paperIds }
    })
    const filtered = q
      ? built.filter(
          ({ r }) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
        )
      : built
    filtered.sort((a, b) => {
      if (sort === 'name') return a.r.name.localeCompare(b.r.name)
      // Load: fullest first, then by how close to the limit, then name.
      if (b.load.used !== a.load.used) return b.load.used - a.load.used
      return a.r.name.localeCompare(b.r.name)
    })
    return filtered
  }, [reviewers, assignments, settings, sort, query])

  if (!run) {
    return (
      <ScreenShell
        title="Reviewer workload"
        intro="Run a match first to see how the papers are spread across reviewers."
        nav={<ReviewSubnav />}
      >
        <EmptyState
          art="charts"
          text="No match yet. Run one to see each reviewer's load and their papers."
          ctaTo="/match"
          ctaLabel="Go to Match"
        />
      </ScreenShell>
    )
  }

  const idle = rows.filter((x) => x.load.used === 0).length
  const over = rows.filter((x) => x.load.over).length

  return (
    <ScreenShell
      title="Reviewer workload"
      intro="Each reviewer's assigned papers versus their load limit. Click a paper to inspect that pairing."
      nav={<ReviewSubnav />}
    >
      <div className="workload-toolbar">
        <input
          className="board-search"
          type="search"
          placeholder="Find a reviewer…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Find a reviewer"
        />
        <div className="seg" role="group" aria-label="Sort reviewers">
          <button
            type="button"
            className={sort === 'load' ? 'seg__btn seg__btn--on' : 'seg__btn'}
            aria-pressed={sort === 'load'}
            onClick={() => setSort('load')}
          >
            By load
          </button>
          <button
            type="button"
            className={sort === 'name' ? 'seg__btn seg__btn--on' : 'seg__btn'}
            aria-pressed={sort === 'name'}
            onClick={() => setSort('name')}
          >
            By name
          </button>
        </div>
        <span className="workload-toolbar__counts muted">
          {over > 0 && <span className="workload-count workload-count--over">{over} overloaded</span>}
          {idle > 0 && <span className="workload-count">{idle} idle</span>}
        </span>
      </div>

      <div className="workload-list">
        {rows.map(({ r, load, paperIds }) => (
          <section
            key={r.id}
            className={`workload-row${load.over ? ' workload-row--over' : ''}${
              load.used === 0 ? ' workload-row--idle' : ''
            }`}
          >
            <div className="workload-row__head">
              <Link
                to={`/details?mode=reviewer&id=${encodeURIComponent(r.id)}`}
                className="workload-row__name"
              >
                {r.name}
              </Link>
              <span className="workload-row__role muted">{r.role}</span>
              <span
                className={`workload-row__load${load.over ? ' workload-row__load--over' : ''}`}
                title="Papers assigned vs load limit"
              >
                {load.used}/{load.limit}
              </span>
            </div>
            <div className="workload-row__papers">
              {paperIds.length === 0 ? (
                <span className="workload-row__none muted">No papers assigned</span>
              ) : (
                paperIds.map((pid) => {
                  const p = paperById.get(pid)
                  const score = averagePaperScore(run, assignments, pid)
                  return (
                    <Link
                      key={pid}
                      to={`/details?mode=paper&id=${encodeURIComponent(pid)}`}
                      className="workload-pill"
                      title={p?.title || pid}
                    >
                      <span className="workload-pill__id">{pid}</span>
                      <span className="workload-pill__title">{p?.title || pid}</span>
                      {score != null && <span className="workload-pill__score">{fmtScore(score)}</span>}
                    </Link>
                  )
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </ScreenShell>
  )
}
