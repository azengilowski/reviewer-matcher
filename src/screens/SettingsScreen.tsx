import { useMemo, useState } from 'react'
import { computeFeasibility } from '../domain/feasibility'
import { capacityForPaper, DEFAULT_SETTINGS, loadForReviewer } from '../domain/settings'
import { EMBEDDING_MODELS } from '../similarity/models'
import type { MatchSettings } from '../domain/types'
import { useApp } from '../state/AppStore'
import { ScreenShell } from './ScreenShell'

export function SettingsScreen() {
  const { reviewers, papers, settings, setSettings } = useApp()
  const feasibility = computeFeasibility(reviewers, papers, settings)
  const isDefault = JSON.stringify(settings) === JSON.stringify(DEFAULT_SETTINGS)

  function update(patch: Partial<MatchSettings>) {
    setSettings({ ...settings, ...patch })
  }
  function updateRoleLoad(role: string, load: number) {
    update({ loadsByRole: { ...settings.loadsByRole, [role]: load } })
  }

  return (
    <ScreenShell
      title="Settings"
      intro="Configure how the match runs. Changes apply to the next run."
    >
      <div className="settings-topbar">
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => setSettings(DEFAULT_SETTINGS)}
          disabled={isDefault}
          title="Restore every setting to its default value"
        >
          Reset to defaults
        </button>
      </div>

      <section className="settings-group">
        <h3>Capacity &amp; load</h3>
        <label className="settings-field">
          <span>Reviewers per paper (default capacity)</span>
          <input
            type="number"
            min={1}
            value={settings.paperCapacity}
            aria-label="Reviewers per paper"
            onChange={(e) => update({ paperCapacity: Math.max(1, Number(e.target.value) || 1) })}
          />
        </label>

        <div className="settings-roles">
          <span className="settings-field__label">Max papers per reviewer, by role</span>
          {Object.entries(settings.loadsByRole).map(([role, load]) => (
            <label key={role} className="settings-role">
              <span>{role}</span>
              <input
                type="number"
                min={0}
                value={load}
                aria-label={`Load for ${role}`}
                onChange={(e) => updateRoleLoad(role, Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
          ))}
          <label className="settings-role">
            <span title="Used for any role that isn't listed above">any unlisted role</span>
            <input
              type="number"
              min={0}
              value={settings.defaultLoad}
              aria-label="Default load"
              onChange={(e) => update({ defaultLoad: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
        </div>

        <label className="settings-field">
          <span>Minimum papers per reviewer (0 = off)</span>
          <input
            type="number"
            min={0}
            value={settings.minLoad}
            aria-label="Minimum papers per reviewer"
            onChange={(e) => update({ minLoad: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <p className="muted settings-hint">
          Enforces a fairness floor so no reviewer is left nearly idle, swapping under-loaded
          reviewers onto papers, trading a little match quality for balance.
        </p>

        <FeasibilityBadge {...feasibility} />
      </section>

      <section className="settings-group">
        <h3>Matching signal</h3>
        <label className="settings-field">
          <span>Embedding model</span>
          <select
            aria-label="Embedding model"
            value={settings.embeddingModel}
            onChange={(e) => update({ embeddingModel: e.target.value })}
          >
            {EMBEDDING_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · ~{m.sizeMB}MB
              </option>
            ))}
          </select>
        </label>
        <p className="muted settings-hint">
          Larger models download more and aren't necessarily better. On the AERA test set
          MiniLM-L6 (the default) matched the human panel best. Switching models re-downloads
          and requires a re-run.
        </p>
        <label className="settings-field">
          <span>Method-match boost ({settings.methodBoost.toFixed(2)})</span>
          <input
            type="range"
            min={0}
            max={0.3}
            step={0.02}
            value={settings.methodBoost}
            aria-label="Method-match boost"
            onChange={(e) => update({ methodBoost: Number(e.target.value) })}
          />
        </label>
        <p className="muted settings-hint">
          Adds a bonus when a reviewer's expertise mentions the paper's methodology (e.g.
          Qualitative), so methodology fit counts alongside topic similarity.
        </p>
      </section>

      <ProposingSide side={settings.proposingSide} onChange={(s) => update({ proposingSide: s })} />

      <section className="settings-group">
        <h3>Conflicts &amp; reproducibility</h3>
        <label className="settings-check">
          <input
            type="checkbox"
            checked={settings.excludeSelfAuthorship}
            onChange={(e) => update({ excludeSelfAuthorship: e.target.checked })}
          />{' '}
          Exclude reviewers from papers they authored
        </label>
        <label className="settings-field">
          <span>Random seed (for reproducible runs)</span>
          <input
            type="text"
            value={settings.seed}
            aria-label="Random seed"
            onChange={(e) => update({ seed: e.target.value })}
          />
        </label>
      </section>

      <OverridesPanel />
    </ScreenShell>
  )
}

/** Advanced: per-reviewer load and per-paper capacity overrides (SPEC §4.3). */
function OverridesPanel() {
  const { reviewers, papers, settings, setReviewers, setPapers } = useApp()
  const [filter, setFilter] = useState('')
  const q = filter.trim().toLowerCase()

  const shownReviewers = useMemo(
    () => reviewers.filter((r) => !q || r.name.toLowerCase().includes(q) || r.id.includes(q)),
    [reviewers, q],
  )
  const shownPapers = useMemo(
    () => papers.filter((p) => !q || p.title.toLowerCase().includes(q) || p.id.includes(q)),
    [papers, q],
  )

  return (
    <details className="settings-group">
      <summary>
        <h3 style={{ display: 'inline' }}>Advanced: per-item overrides</h3>
      </summary>
      <input
        type="search"
        placeholder="Filter by name / id…"
        aria-label="Filter overrides"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="settings-filter"
      />
      <div className="overrides-grid">
        <div>
          <strong>Reviewer load</strong>
          <div className="overrides-list">
            {shownReviewers.map((r) => (
              <label key={r.id} className="overrides-row">
                <span title={r.id}>{r.name}</span>
                <input
                  type="number"
                  min={0}
                  placeholder={String(loadForReviewer({ ...r, loadOverride: undefined }, settings))}
                  value={r.loadOverride ?? ''}
                  aria-label={`Load override for ${r.name}`}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0)
                    setReviewers(reviewers.map((x) => (x.id === r.id ? { ...x, loadOverride: v } : x)))
                  }}
                />
              </label>
            ))}
          </div>
        </div>
        <div>
          <strong>Paper capacity</strong>
          <div className="overrides-list">
            {shownPapers.map((p) => (
              <label key={p.id} className="overrides-row">
                <span title={p.id}>{p.title || p.id}</span>
                <input
                  type="number"
                  min={1}
                  placeholder={String(capacityForPaper({ ...p, capacityOverride: undefined }, settings))}
                  value={p.capacityOverride ?? ''}
                  aria-label={`Capacity override for ${p.id}`}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : Math.max(1, Number(e.target.value) || 1)
                    setPapers(papers.map((x) => (x.id === p.id ? { ...x, capacityOverride: v } : x)))
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </details>
  )
}

function FeasibilityBadge({ demand, supply, feasible }: ReturnType<typeof computeFeasibility>) {
  return (
    <p className={feasible ? 'feasibility feasibility--ok' : 'feasibility feasibility--warn'}>
      {feasible ? '✓' : '⚠️'} Demand {demand} reviewer-slots vs supply {supply}.{' '}
      {feasible
        ? 'Reviewers can cover all papers.'
        : 'Not enough reviewer capacity, so some papers will be under-filled.'}
    </p>
  )
}

const ADVANTAGE: Record<MatchSettings['proposingSide'], string> = {
  papers: 'Papers get their most-preferred reviewers; reviewers may get lower picks.',
  reviewers: 'Reviewers get their most-preferred papers; papers may get lower picks.',
}

function ProposingSide({
  side,
  onChange,
}: {
  side: MatchSettings['proposingSide']
  onChange: (s: MatchSettings['proposingSide']) => void
}) {
  const [showWhy, setShowWhy] = useState(false)
  return (
    <section className="settings-group">
      <h3>Which side proposes</h3>
      <div className="settings-radios">
        {(['papers', 'reviewers'] as const).map((option) => (
          <label key={option} className={side === option ? 'settings-radio settings-radio--on' : 'settings-radio'}>
            <input
              type="radio"
              name="proposingSide"
              checked={side === option}
              onChange={() => onChange(option)}
            />
            <span className="settings-radio__title">
              {option === 'papers' ? 'Papers propose' : 'Reviewers propose'}
              {option === 'papers' && <span className="settings-radio__default"> (default)</span>}
            </span>
            <span className="settings-radio__advantage">{ADVANTAGE[option]}</span>
          </label>
        ))}
      </div>

      <button className="linklike" onClick={() => setShowWhy((v) => !v)} aria-expanded={showWhy}>
        Why does this matter?
      </button>
      {showWhy && (
        <p className="settings-why">
          Deferred acceptance advantages the proposing side: proposers get their best possible
          stable match, while the receiving side gets their worst. So this choice decides whether
          papers or reviewers get their top picks.
        </p>
      )}

      <p className="settings-effect">
        {side === 'papers'
          ? 'With papers proposing, each paper is filled with the best reviewers it can stably get.'
          : 'With reviewers proposing, each reviewer gets the best papers they can stably get.'}
      </p>
    </section>
  )
}
