import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { computeDashboard, type Bar, type Pairing } from '../analytics/stats'
import { capacityForPaper } from '../domain/settings'
import { fmtScore } from '../domain/format'
import type { Paper, Reviewer } from '../domain/types'
import {
  averagePaperScore,
  paperRoleStatus,
  papersForReviewer,
  reviewerLoadStatus,
} from '../editing/validation'
import { useApp } from '../state/AppStore'
import { EmptyState } from './EmptyState'
import { ReviewSubnav } from './ReviewSubnav'
import { ScreenShell } from './ScreenShell'

export function DashboardScreen() {
  const { reviewers, papers, settings, run, assignments, runHistory } = useApp()
  // Papers whose average similarity falls below this need a look (configurable).
  const weakScore = settings.weakThreshold ?? 0.4

  const stats = useMemo(
    () => (run ? computeDashboard(reviewers, papers, settings, run, assignments) : null),
    [reviewers, papers, settings, run, assignments],
  )
  // The specific items behind the warning counts, so the review is actionable.
  const attention = useMemo(() => {
    if (!run) return null
    const paperInfo = papers.map((p) => ({
      p,
      cap: capacityForPaper(p, settings),
      used: assignments.filter((a) => a.paperId === p.id).length,
      score: averagePaperScore(run, assignments, p.id),
    }))
    const reviewerMap = new Map(reviewers.map((r) => [r.id, r]))
    const roleGaps = papers
      .map((p) => ({
        p,
        gaps: paperRoleStatus(assignments, p.id, reviewerMap, settings).filter(
          (g) => g.have < g.min,
        ),
      }))
      .filter((x) => x.gaps.length > 0)
    return {
      roleGaps,
      unfilled: paperInfo.filter((x) => x.used < x.cap),
      overCap: paperInfo.filter((x) => x.used > x.cap),
      weak: paperInfo.filter((x) => x.used > 0 && x.score != null && x.score < weakScore),
      overloaded: reviewers
        .map((r) => ({ r, s: reviewerLoadStatus(assignments, r, settings) }))
        .filter((x) => x.s.over),
      idle: reviewers.filter((r) => papersForReviewer(assignments, r.id).length === 0),
      weakScore,
    }
  }, [run, papers, reviewers, assignments, settings, weakScore])
  const autoStats = useMemo(
    () => (run ? computeDashboard(reviewers, papers, settings, run, run.assignments) : null),
    [reviewers, papers, settings, run],
  )
  const nameById = useMemo(() => new Map(reviewers.map((r) => [r.id, r.name])), [reviewers])

  if (!run || !stats || !autoStats) {
    return (
      <ScreenShell title="Match quality" intro="Run a match to see how well it went." nav={<ReviewSubnav />}>
        <EmptyState
          art="charts"
          text="No match yet. Once you run one, its quality stats land here."
          ctaTo="/match"
          ctaLabel="Go to Match"
        />
      </ScreenShell>
    )
  }

  const edited = stats.manual > 0

  return (
    <ScreenShell
      title="Match quality"
      intro="How well the match went: load, preference satisfaction, and outliers."
      nav={<ReviewSubnav />}
    >
      {attention && <NeedsAttention a={attention} />}

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
                  <td>{h.stable ? '✓' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartCard>
      )}
    </ScreenShell>
  )
}

type PaperInfo = { p: Paper; cap: number; used: number; score: number | null }
type Attn = {
  roleGaps: { p: Paper; gaps: { role: string; min: number; have: number }[] }[]
  unfilled: PaperInfo[]
  overCap: PaperInfo[]
  weak: PaperInfo[]
  overloaded: { r: Reviewer; s: { used: number; limit: number; over: boolean } }[]
  idle: Reviewer[]
  weakScore: number
}

const paperLink = (id: string) => `/details?mode=paper&id=${encodeURIComponent(id)}`
const reviewerLink = (id: string) => `/details?mode=reviewer&id=${encodeURIComponent(id)}`

/** Actionable outliers, each linking to its Details view to investigate/fix. */
function NeedsAttention({ a }: { a: Attn }) {
  const total =
    a.unfilled.length +
    a.overCap.length +
    a.weak.length +
    a.overloaded.length +
    a.idle.length +
    a.roleGaps.length
  return (
    <section className="attention chart-card">
      <div className="attention__head">
        <h3 className="chart-card__title">Needs attention</h3>
        {total > 0 && <span className="attention__count">{total}</span>}
      </div>
      {total === 0 ? (
        <p className="attention__clear">
          <CheckIcon /> Everything looks good — every paper is filled, no reviewer is overloaded, and
          all matches are solid.
        </p>
      ) : (
        <div className="attention__groups">
          <AttentionGroup
            tone="warn"
            title="Role minimums unmet"
            hint="papers short of a required role"
            items={a.roleGaps.map((x) => ({
              id: x.p.id,
              label: x.p.id,
              sub: x.gaps.map((g) => `${g.have}/${g.min} ${g.role}`).join(' · '),
              title: `${x.p.title || x.p.id} — ${x.gaps
                .map((g) => `has ${g.have} of ${g.min} required ${g.role} reviewer(s)`)
                .join('; ')}`,
              to: paperLink(x.p.id),
            }))}
          />
          <AttentionGroup
            tone="warn"
            title="Papers unfilled"
            hint="fewer reviewers than capacity"
            items={a.unfilled.map((x) => ({
              id: x.p.id,
              label: x.p.id,
              sub: `${x.used}/${x.cap}`,
              title: `${x.p.title || x.p.id} — ${x.used} of ${x.cap} reviewers`,
              to: paperLink(x.p.id),
            }))}
          />
          <AttentionGroup
            tone="warn"
            title="Papers over capacity"
            items={a.overCap.map((x) => ({
              id: x.p.id,
              label: x.p.id,
              sub: `${x.used}/${x.cap}`,
              title: `${x.p.title || x.p.id} — ${x.used} of ${x.cap} reviewers`,
              to: paperLink(x.p.id),
            }))}
          />
          <AttentionGroup
            tone="warn"
            title="Weak matches"
            hint={`average similarity below ${a.weakScore.toFixed(2)}`}
            items={a.weak.map((x) => ({
              id: x.p.id,
              label: x.p.id,
              sub: fmtScore(x.score!),
              title: `${x.p.title || x.p.id} — average similarity ${fmtScore(x.score!)}`,
              to: paperLink(x.p.id),
            }))}
          />
          <AttentionGroup
            tone="danger"
            title="Overloaded reviewers"
            hint="more papers than their limit"
            items={a.overloaded.map((x) => ({
              id: x.r.id,
              label: x.r.name,
              sub: `${x.s.used}/${x.s.limit}`,
              title: `${x.r.name} — assigned ${x.s.used}, limit ${x.s.limit}`,
              to: reviewerLink(x.r.id),
            }))}
          />
          <AttentionGroup
            tone="muted"
            title="Idle reviewers"
            hint="no papers assigned"
            items={a.idle.map((r) => ({
              id: r.id,
              label: r.name,
              title: `${r.name} — no papers assigned`,
              to: reviewerLink(r.id),
            }))}
          />
        </div>
      )}
    </section>
  )
}

type AttnItem = { id: string; label: string; sub?: string; title: string; to: string }

function AttentionGroup({
  tone,
  title,
  hint,
  items,
}: {
  tone: 'warn' | 'danger' | 'muted'
  title: string
  hint?: string
  items: AttnItem[]
}) {
  if (items.length === 0) return null
  return (
    <div className="attention__group">
      <div className="attention__grouphead">
        <span className={`attention__dot attention__dot--${tone}`} />
        <strong>
          {items.length} {title}
        </strong>
        {hint && <span className="muted"> · {hint}</span>}
      </div>
      <div className="attention__pills">
        {items.map((it) => (
          <Link
            key={it.id}
            className={`attention__pill attention__pill--${tone}`}
            to={it.to}
            title={it.title}
          >
            {it.label}
            {it.sub && <span className="attention__pillsub">{it.sub}</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="#1a7f37"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 L9 17 l-5 -5" />
    </svg>
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
          <span className="pairlist__score">{fmtScore(p.score, 3)}</span>
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
