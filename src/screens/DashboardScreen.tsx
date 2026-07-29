import { useMemo } from 'react'
import { computeDashboard, type Bar, type Pairing } from '../analytics/stats'
import { useApp } from '../state/AppStore'
import { ScreenShell } from './ScreenShell'

export function DashboardScreen() {
  const { reviewers, papers, settings, run, assignments, runHistory } = useApp()

  const stats = useMemo(
    () => (run ? computeDashboard(reviewers, papers, settings, run, assignments) : null),
    [reviewers, papers, settings, run, assignments],
  )
  const autoStats = useMemo(
    () => (run ? computeDashboard(reviewers, papers, settings, run, run.assignments) : null),
    [reviewers, papers, settings, run],
  )
  const nameById = useMemo(() => new Map(reviewers.map((r) => [r.id, r.name])), [reviewers])

  if (!run || !stats || !autoStats) {
    return (
      <ScreenShell title="Match quality" intro="Run a match to see how well it went.">
        <p className="muted">No match yet — go to the Match tab and run one.</p>
      </ScreenShell>
    )
  }

  const edited = stats.manual > 0

  return (
    <ScreenShell title="Match quality" intro="How well the match went — load, preference satisfaction, and outliers.">
      <div className="stat-tiles">
        <Tile label="Assignments" value={stats.assignments} />
        <Tile label="Reviewers get #1" value={`${Math.round(stats.pctTop1)}%`} />
        <Tile label="Reviewers get top-3" value={`${Math.round(stats.pctTop3)}%`} />
        <Tile label="Mean paper rank" value={stats.meanPaperRank.toFixed(2)} />
        <Tile label="Median paper rank" value={stats.medianPaperRank.toFixed(1)} />
        <Tile label="Papers unfilled" value={stats.unfilledPapers} warn={stats.unfilledPapers > 0} />
        <Tile label="Reviewers idle" value={stats.idleReviewers} />
        <Tile label="Over capacity" value={stats.overCapPapers} warn={stats.overCapPapers > 0} />
        <Tile label="Over load" value={stats.overLoadReviewers} warn={stats.overLoadReviewers > 0} />
        {stats.conflictOverrides > 0 && (
          <Tile label="Conflict overrides" value={stats.conflictOverrides} warn />
        )}
      </div>

      <div className="chart-grid">
        <ChartCard title="Reviewers per paper">
          <BarChart bars={stats.capHistogram} />
        </ChartCard>
        <ChartCard title="Papers per reviewer">
          <BarChart bars={stats.loadHistogram} />
        </ChartCard>
        <ChartCard title="Chosen paper-rank distribution">
          <BarChart bars={stats.rankHistogram} />
        </ChartCard>
      </div>

      {edited && (
        <ChartCard title="Auto vs edited">
          <table className="compare-table">
            <thead>
              <tr>
                <th></th>
                <th>Auto</th>
                <th>Edited</th>
              </tr>
            </thead>
            <tbody>
              <CompareRow label="Mean paper rank" a={autoStats.meanPaperRank.toFixed(2)} b={stats.meanPaperRank.toFixed(2)} />
              <CompareRow label="Reviewers get #1" a={`${Math.round(autoStats.pctTop1)}%`} b={`${Math.round(stats.pctTop1)}%`} />
              <CompareRow label="Papers unfilled" a={autoStats.unfilledPapers} b={stats.unfilledPapers} />
              <CompareRow label="Over capacity" a={autoStats.overCapPapers} b={stats.overCapPapers} />
            </tbody>
          </table>
        </ChartCard>
      )}

      <div className="chart-grid">
        <ChartCard title="Best matches (highest similarity)">
          <PairList pairs={stats.best} nameById={nameById} />
        </ChartCard>
        <ChartCard title="Worst matches (lowest similarity)">
          <PairList pairs={stats.worst} nameById={nameById} />
        </ChartCard>
      </div>

      {runHistory.length > 1 && (
        <ChartCard title="Run comparison">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Capacity</th>
                <th>Proposing</th>
                <th>Assignments</th>
                <th>Mean rank</th>
                <th>Unfilled</th>
                <th>Stable</th>
              </tr>
            </thead>
            <tbody>
              {runHistory.slice(0, 8).map((h, i) => (
                <tr key={i}>
                  <td>{h.paperCapacity}</td>
                  <td>{h.proposingSide}</td>
                  <td>{h.assignments}</td>
                  <td>{h.meanPaperRank.toFixed(2)}</td>
                  <td>{h.unfilledPapers}</td>
                  <td>{h.stable ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartCard>
      )}
    </ScreenShell>
  )
}

function Tile({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className={warn ? 'tile tile--warn' : 'tile'}>
      <span className="tile__value">{value}</span>
      <span className="tile__label">{label}</span>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="chart-card">
      <h3 className="chart-card__title">{title}</h3>
      {children}
    </div>
  )
}

function BarChart({ bars }: { bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.count))
  if (bars.length === 0) return <p className="muted">No data.</p>
  return (
    <div className="barchart">
      {bars.map((b) => (
        <div key={b.label} className="barchart__row">
          <span className="barchart__label">{b.label}</span>
          <div className="barchart__track">
            <div className="barchart__fill" style={{ width: `${(b.count / max) * 100}%` }} />
          </div>
          <span className="barchart__count">{b.count}</span>
        </div>
      ))}
    </div>
  )
}

function PairList({ pairs, nameById }: { pairs: Pairing[]; nameById: Map<string, string> }) {
  if (pairs.length === 0) return <p className="muted">No data.</p>
  return (
    <ul className="pairlist">
      {pairs.map((p) => (
        <li key={`${p.paperId}:${p.reviewerId}`}>
          <span>
            {p.paperId} ↔ {nameById.get(p.reviewerId) ?? p.reviewerId}
          </span>
          <span className="pairlist__score">{p.score.toFixed(3)}</span>
        </li>
      ))}
    </ul>
  )
}

function CompareRow({ label, a, b }: { label: string; a: string | number; b: string | number }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{a}</td>
      <td>{b}</td>
    </tr>
  )
}
