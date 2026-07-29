import { useState } from 'react'
import { Link } from 'react-router-dom'
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
  const { reviewers, papers, setReviewers, setPapers } = useApp()
  const [warnings, setWarnings] = useState<string[]>([])
  const [loadingSample, setLoadingSample] = useState(false)

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
    } finally {
      setLoadingSample(false)
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
            onImport={(rows, w) => {
              setReviewers(rows)
              setWarnings(w)
            }}
          />
          <p className="upload-card__count" data-testid="count-reviewers">
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
            onImport={(rows, w) => {
              setPapers(rows)
              setWarnings(w)
            }}
          />
          <p className="upload-card__count" data-testid="count-papers">
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

      <div className="upload-next">
        <button className="btn btn--ghost" onClick={loadSample} disabled={loadingSample}>
          {loadingSample ? 'Loading…' : 'Load sample data'}
        </button>
        {reviewers.length > 0 && papers.length > 0 && (
          <Link className="btn" to="/settings" title="Next step: configure the match settings">
            Continue to Settings →
          </Link>
        )}
      </div>

      <hr className="rule" />
      <h3 className="upload-section">Save or restore a project</h3>
      <p className="muted upload-section__hint">
        Export a <code>.matchproj</code> file to back up or move everything (data, settings, match,
        edits) — re-import it to pick up exactly where you left off. You can also re-import a
        hand-edited results CSV.
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
