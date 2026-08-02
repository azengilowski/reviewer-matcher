import { useState } from 'react'
import {
  buildPapers,
  buildReviewers,
  PAPER_FIELDS,
  REVIEWER_FIELDS,
} from '../io/mapping'
import { parseDelimited } from '../io/readTable'
import type { Paper, Reviewer } from '../domain/types'
import { useApp } from '../state/AppStore'
import { AddEntityModal } from './AddEntityModal'
import { WarningIcon } from './Icons'
import { ImportWizard } from './ImportWizard'
import { ProjectBar } from './ProjectBar'
import { ScreenShell } from './ScreenShell'
import { Toast, useToast } from './Toast'

export function UploadScreen() {
  const { reviewers, papers, run, assignments, setReviewers, setPapers, sampleLoaded, setSampleLoaded } = useApp()
  const [warnings, setWarnings] = useState<string[]>([])
  const [loadingSample, setLoadingSample] = useState(false)
  const [adding, setAdding] = useState<null | 'reviewer' | 'paper'>(null)
  const [editing, setEditing] = useState<null | { kind: 'reviewer' | 'paper'; id: string }>(null)

  // Transient confirmation toast (sample loaded / sample cleared / replaced).
  const { toast, showToast } = useToast(4000)

  async function loadSample() {
    setLoadingSample(true)
    try {
      const base = import.meta.env.BASE_URL
      const [rev, pap] = await Promise.all([
        fetch(`${base}sample/reviewers.csv`).then((r) => r.text()),
        fetch(`${base}sample/papers.csv`).then((r) => r.text()),
      ])
      // Sample files have headers; map by header alias (position 0 = header row).
      const revRows = parseDelimited(rev)
      const papRows = parseDelimited(pap)
      const r = buildReviewers(revRows.slice(1), headerMapping(revRows[0], REVIEWER_FIELDS))
      const p = buildPapers(papRows.slice(1), headerMapping(papRows[0], PAPER_FIELDS))
      setReviewers(r.rows)
      setPapers(p.rows)
      setWarnings([...r.warnings, ...p.warnings])
      setSampleLoaded(true)
      showToast(`✓ Sample data loaded: ${r.rows.length} reviewers and ${p.rows.length} papers.`)
    } finally {
      setLoadingSample(false)
    }
  }

  /** Importing your own file right after the sample clears the sample from the
   *  other side, so real and sample data never mix in a match. */
  function importReviewers(rows: Reviewer[], w: string[]) {
    const replaced = reviewers.length
    setReviewers(rows)
    setWarnings(w)
    if (sampleLoaded) {
      setPapers([])
      setSampleLoaded(false)
      showToast(`✓ Imported ${rows.length} reviewers and cleared the sample papers.`)
    } else if (replaced > 0) {
      showToast(`✓ Imported ${rows.length} reviewers, replacing the previous ${replaced} (any match was cleared).`)
    }
  }
  function importPapers(rows: Paper[], w: string[]) {
    const replaced = papers.length
    setPapers(rows)
    setWarnings(w)
    if (sampleLoaded) {
      setReviewers([])
      setSampleLoaded(false)
      showToast(`✓ Imported ${rows.length} papers and cleared the sample reviewers.`)
    } else if (replaced > 0) {
      showToast(`✓ Imported ${rows.length} papers, replacing the previous ${replaced} (any match was cleared).`)
    }
  }

  // Changing the data invalidates the run, so say so when one exists.
  const runWarning = run
    ? `You have a match with ${assignments.length} assignments. Changing the data clears it (export first if you want to keep it), and you'll need to re-run.`
    : undefined

  function addReviewer(r: Reviewer) {
    setReviewers([...reviewers, r])
    setAdding(null)
    showToast(`✓ Added reviewer ${r.name}.${run ? ' The match was cleared — re-run when ready.' : ''}`)
  }
  function addPaper(p: Paper) {
    setPapers([...papers, p])
    setAdding(null)
    showToast(`✓ Added paper ${p.id}.${run ? ' The match was cleared — re-run when ready.' : ''}`)
  }

  const clearedNote = run ? ' The match was cleared — re-run when ready.' : ''
  function saveReviewer(updated: Reviewer) {
    setReviewers(reviewers.map((r) => (r.id === editing?.id ? updated : r)))
    setEditing(null)
    showToast(`✓ Updated reviewer ${updated.name}.${clearedNote}`)
  }
  function savePaper(updated: Paper) {
    setPapers(papers.map((p) => (p.id === editing?.id ? updated : p)))
    setEditing(null)
    showToast(`✓ Updated paper ${updated.id}.${clearedNote}`)
  }
  function removeReviewer(id: string) {
    const name = reviewers.find((r) => r.id === id)?.name ?? id
    setReviewers(reviewers.filter((r) => r.id !== id))
    showToast(`✓ Removed reviewer ${name}.${clearedNote}`)
  }
  function removePaper(id: string) {
    setPapers(papers.filter((p) => p.id !== id))
    showToast(`✓ Removed paper ${id}.${clearedNote}`)
  }

  return (
    <ScreenShell
      title="Upload"
      intro="Import reviewers and papers (CSV or Excel), map the columns, and preview before importing. Everything stays in your browser."
    >
      <div className="upload-grid">
        <div className="upload-card">
          <ImportWizard<Reviewer>
            label="Reviewers"
            fields={REVIEWER_FIELDS}
            storageKey="mapping.reviewers"
            build={buildReviewers}
            onImport={importReviewers}
          />
          <p
            className={`upload-card__count${reviewers.length > 0 ? ' upload-card__count--ok' : ''}`}
            data-testid="count-reviewers"
          >
            {reviewers.length > 0 ? '✓ ' : ''}
            {reviewers.length} loaded
            <button className="upload-card__add" onClick={() => setAdding('reviewer')}>
              + Add one manually
            </button>
          </p>
          {reviewers.length > 0 && (
            <details className="upload-preview">
              <summary>View &amp; edit loaded reviewers</summary>
              <ul className="upload-preview__list">
                {reviewers.map((r) => (
                  <li key={r.id} className="upload-preview__row">
                    <span className="upload-preview__label">
                      {r.name} <span className="muted">· {r.role}</span>
                    </span>
                    <button
                      className="upload-preview__act"
                      title={`Edit ${r.name}`}
                      aria-label={`Edit reviewer ${r.name}`}
                      onClick={() => setEditing({ kind: 'reviewer', id: r.id })}
                    >
                      ✎
                    </button>
                    <button
                      className="upload-preview__act upload-preview__act--danger"
                      title={`Remove ${r.name}`}
                      aria-label={`Remove reviewer ${r.name}`}
                      onClick={() => removeReviewer(r.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
        <div className="upload-card">
          <ImportWizard<Paper>
            label="Papers"
            fields={PAPER_FIELDS}
            storageKey="mapping.papers"
            build={buildPapers}
            onImport={importPapers}
          />
          <p
            className={`upload-card__count${papers.length > 0 ? ' upload-card__count--ok' : ''}`}
            data-testid="count-papers"
          >
            {papers.length > 0 ? '✓ ' : ''}
            {papers.length} loaded
            <button className="upload-card__add" onClick={() => setAdding('paper')}>
              + Add one manually
            </button>
          </p>
          {papers.length > 0 && (
            <details className="upload-preview">
              <summary>View &amp; edit loaded papers</summary>
              <ul className="upload-preview__list">
                {papers.map((p) => (
                  <li key={p.id} className="upload-preview__row">
                    <span className="upload-preview__label">
                      <span className="muted">{p.id}</span> {p.title}
                    </span>
                    <button
                      className="upload-preview__act"
                      title={`Edit ${p.id}`}
                      aria-label={`Edit paper ${p.id}`}
                      onClick={() => setEditing({ kind: 'paper', id: p.id })}
                    >
                      ✎
                    </button>
                    <button
                      className="upload-preview__act upload-preview__act--danger"
                      title={`Remove ${p.id}`}
                      aria-label={`Remove paper ${p.id}`}
                      onClick={() => removePaper(p.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>

      <button
        className="btn btn--ghost"
        onClick={loadSample}
        disabled={loadingSample || sampleLoaded}
        title={
          sampleLoaded
            ? 'Sample data is loaded. Import your own file to replace it.'
            : 'Load a small synthetic data set to try the app'
        }
      >
        {loadingSample ? 'Loading…' : sampleLoaded ? '✓ Sample data loaded' : 'Load sample data'}
      </button>

      <hr className="rule" />
      <h3 className="upload-section">Restore a saved project</h3>
      <p className="muted upload-section__hint">
        Import a <code>.matchproj</code> file to pick up exactly where you left off (export one from
        the Export step), or re-import a hand-edited results CSV. Everything stays in your browser.
      </p>
      <ProjectBar />

      {warnings.length > 0 && (
        <details className="warnings" open>
          <summary>{warnings.length} import warning(s)</summary>
          <ul aria-label="Import warnings">
            {warnings.slice(0, 20).map((w, i) => (
              <li key={i}>
                <WarningIcon /> {w}
              </li>
            ))}
          </ul>
        </details>
      )}

      {adding === 'reviewer' && (
        <AddEntityModal<Reviewer>
          noun="reviewer"
          fields={REVIEWER_FIELDS}
          existingIds={reviewers.map((r) => r.id)}
          idPrefix="R"
          build={buildReviewers}
          onAdd={addReviewer}
          onClose={() => setAdding(null)}
          warning={runWarning}
        />
      )}
      {editing?.kind === 'reviewer' && (() => {
        const r = reviewers.find((x) => x.id === editing.id)
        if (!r) return null
        return (
          <AddEntityModal<Reviewer>
            noun="reviewer"
            fields={REVIEWER_FIELDS}
            existingIds={reviewers.map((x) => x.id)}
            idPrefix="R"
            build={buildReviewers}
            onAdd={saveReviewer}
            onClose={() => setEditing(null)}
            warning={runWarning}
            initial={{
              id: r.id,
              name: r.name,
              role: r.role,
              criteria: r.criteria,
              institution: r.institution ?? '',
            }}
          />
        )
      })()}
      {editing?.kind === 'paper' && (() => {
        const pap = papers.find((x) => x.id === editing.id)
        if (!pap) return null
        return (
          <AddEntityModal<Paper>
            noun="paper"
            fields={PAPER_FIELDS}
            existingIds={papers.map((x) => x.id)}
            idPrefix="P"
            build={buildPapers}
            onAdd={savePaper}
            onClose={() => setEditing(null)}
            warning={runWarning}
            initial={{
              id: pap.id,
              title: pap.title,
              abstract: pap.abstract,
              keywords: pap.keywords,
              method: pap.method,
              authors: pap.authors,
            }}
          />
        )
      })()}
      {adding === 'paper' && (
        <AddEntityModal<Paper>
          noun="paper"
          fields={PAPER_FIELDS}
          existingIds={papers.map((p) => p.id)}
          idPrefix="P"
          build={buildPapers}
          onAdd={addPaper}
          onClose={() => setAdding(null)}
          warning={runWarning}
        />
      )}

      <Toast message={toast} />
    </ScreenShell>
  )
}

/** Build a header-based mapping for the bundled sample files. */
function headerMapping(headerRow: string[], fields: typeof REVIEWER_FIELDS) {
  const lowered = headerRow.map((h) => h.trim().toLowerCase())
  const mapping: Record<string, number> = {}
  for (const f of fields) mapping[f.key] = lowered.findIndex((h) => f.aliases.includes(h))
  return mapping
}
