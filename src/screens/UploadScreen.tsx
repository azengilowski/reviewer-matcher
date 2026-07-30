import { useEffect, useRef, useState } from 'react'
import {
  buildPapers,
  buildReviewers,
  PAPER_FIELDS,
  REVIEWER_FIELDS,
} from '../io/mapping'
import { parseDelimited } from '../io/readTable'
import type { Paper, Reviewer } from '../domain/types'
import { useApp } from '../state/AppStore'
import { ImportWizard } from './ImportWizard'
import { ProjectBar } from './ProjectBar'
import { ScreenShell } from './ScreenShell'

export function UploadScreen() {
  const { reviewers, papers, setReviewers, setPapers, sampleLoaded, setSampleLoaded } = useApp()
  const [warnings, setWarnings] = useState<string[]>([])
  const [loadingSample, setLoadingSample] = useState(false)

  // Transient confirmation toast (sample loaded / sample cleared).
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  function showToast(message: string) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

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
    setReviewers(rows)
    setWarnings(w)
    if (sampleLoaded) {
      setPapers([])
      setSampleLoaded(false)
      showToast(`✓ Imported ${rows.length} reviewers and cleared the sample papers.`)
    }
  }
  function importPapers(rows: Paper[], w: string[]) {
    setPapers(rows)
    setWarnings(w)
    if (sampleLoaded) {
      setReviewers([])
      setSampleLoaded(false)
      showToast(`✓ Imported ${rows.length} papers and cleared the sample reviewers.`)
    }
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
          </p>
          {reviewers.length > 0 && (
            <details className="upload-preview">
              <summary>Preview loaded reviewers</summary>
              <ul>
                {reviewers.slice(0, 6).map((r) => (
                  <li key={r.id}>
                    {r.name} <span className="muted">· {r.role}</span>
                  </li>
                ))}
                {reviewers.length > 6 && (
                  <li className="muted">…and {reviewers.length - 6} more</li>
                )}
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
          </p>
          {papers.length > 0 && (
            <details className="upload-preview">
              <summary>Preview loaded papers</summary>
              <ul>
                {papers.slice(0, 6).map((p) => (
                  <li key={p.id}>
                    <span className="muted">{p.id}</span> {p.title}
                  </li>
                ))}
                {papers.length > 6 && <li className="muted">…and {papers.length - 6} more</li>}
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
              <li key={i}>⚠️ {w}</li>
            ))}
          </ul>
        </details>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
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
