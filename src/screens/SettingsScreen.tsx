import { useEffect, useMemo, useState } from 'react'
import { computeFeasibility } from '../domain/feasibility'
import { capacityForPaper, DEFAULT_SETTINGS, loadForReviewer } from '../domain/settings'
import { EMBEDDING_MODELS } from '../similarity/models'
import type { MatchSettings } from '../domain/types'
import { useApp } from '../state/AppStore'
import { NumberField } from './NumberField'
import { ScreenShell } from './ScreenShell'

export function SettingsScreen() {
  const { reviewers, papers, settings, setSettings, setSettingsInvalid } = useApp()
  const feasibility = computeFeasibility(reviewers, papers, settings)
  const isDefault = JSON.stringify(settings) === JSON.stringify(DEFAULT_SETTINGS)

  // Fields currently holding an empty/invalid draft. The store only ever sees
  // valid values; this set gates "Next: Match" until every field is filled in.
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set())
  // Remounts the number fields so "Reset to defaults" also clears empty drafts.
  const [fieldsEpoch, setFieldsEpoch] = useState(0)
  const fieldValidity = (key: string) => (valid: boolean) =>
    setInvalidFields((prev) => {
      if (valid ? !prev.has(key) : prev.has(key)) return prev
      const next = new Set(prev)
      if (valid) next.delete(key)
      else next.add(key)
      return next
    })
  useEffect(() => {
    setSettingsInvalid(invalidFields.size > 0)
  }, [invalidFields, setSettingsInvalid])
  // Leaving the screen discards drafts, so the gate lifts with them.
  useEffect(() => () => setSettingsInvalid(false), [setSettingsInvalid])

  function resetToDefaults() {
    setSettings(DEFAULT_SETTINGS)
    setInvalidFields(new Set())
    setFieldsEpoch((n) => n + 1)
  }

  function update(patch: Partial<MatchSettings>) {
    setSettings({ ...settings, ...patch })
  }
  function updateRoleLoad(role: string, load: number) {
    update({ loadsByRole: { ...settings.loadsByRole, [role]: load } })
  }

  return (
    <ScreenShell
      title="Configure"
      intro="Configure how the match runs. Changes apply to the next run."
    >
      <div className="settings-topbar">
        <button
          className="btn btn--ghost btn--sm"
          onClick={resetToDefaults}
          disabled={isDefault}
          title="Restore every setting to its default value"
        >
          Reset to defaults
        </button>
      </div>

      <section className="settings-group" key={fieldsEpoch}>
        <h3>Capacity &amp; load</h3>
        <label className="settings-field">
          <span>Reviewers per paper (default capacity)</span>
          <NumberField
            value={settings.paperCapacity}
            min={1}
            ariaLabel="Reviewers per paper"
            onCommit={(n) => update({ paperCapacity: n })}
            onValidityChange={fieldValidity('paperCapacity')}
          />
        </label>

        <div className="settings-roles">
          <span className="settings-field__label">Max papers per reviewer, by role</span>
          {Object.entries(settings.loadsByRole).map(([role, load]) => (
            <label key={role} className="settings-role">
              <span>{role}</span>
              <NumberField
                value={load}
                min={0}
                ariaLabel={`Load for ${role}`}
                onCommit={(n) => updateRoleLoad(role, n)}
                onValidityChange={fieldValidity(`load:${role}`)}
              />
            </label>
          ))}
          <label className="settings-role">
            <span title="Used for any role that isn't listed above">any unlisted role</span>
            <NumberField
              value={settings.defaultLoad}
              min={0}
              ariaLabel="Default load"
              onCommit={(n) => update({ defaultLoad: n })}
              onValidityChange={fieldValidity('defaultLoad')}
            />
          </label>
        </div>

        <label className="settings-field">
          <span>Minimum papers per reviewer (0 = off)</span>
          <NumberField
            value={settings.minLoad}
            min={0}
            ariaLabel="Minimum papers per reviewer"
            onCommit={(n) => update({ minLoad: n })}
            onValidityChange={fieldValidity('minLoad')}
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
                  onWheel={(e) => e.currentTarget.blur()}
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
                  onWheel={(e) => e.currentTarget.blur()}
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

      <button className="linklike" onClick={() => setShowWhy(true)}>
        Why does this matter?
      </button>
      {showWhy && (
        <div className="modal-backdrop" onClick={() => setShowWhy(false)}>
          <div
            className="modal modal--confirm"
            role="dialog"
            aria-modal="true"
            aria-label="Why the proposing side matters"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__head">
              <strong>Why does this matter?</strong>
              <button className="modal__close" onClick={() => setShowWhy(false)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="modal__hint">
              The matching algorithm (deferred acceptance) advantages the proposing side: proposers
              get their best possible stable match, while the receiving side gets their worst. So
              this choice decides whether papers or reviewers get their top picks. Either way, the
              result is stable; it only changes who the ties break toward.
            </p>
            <div className="modal__foot">
              <button className="btn" onClick={() => setShowWhy(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="settings-effect">
        {side === 'papers'
          ? 'With papers proposing, each paper is filled with the best reviewers it can stably get.'
          : 'With reviewers proposing, each reviewer gets the best papers they can stably get.'}
      </p>
    </section>
  )
}
