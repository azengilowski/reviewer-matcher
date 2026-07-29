import { useState } from 'react'
import { downloadText } from '../io/download'
import { parseProject, serializeProject } from '../io/project'
import { importResultsCsv, type ResolutionReport } from '../io/resultsImport'
import { useApp } from '../state/AppStore'

export function ProjectBar() {
  const {
    reviewers,
    papers,
    settings,
    run,
    assignments,
    lockedPapers,
    auditLog,
    runHistory,
    loadProject,
    commitAssignments,
  } = useApp()
  const [message, setMessage] = useState<string | null>(null)
  const [report, setReport] = useState<ResolutionReport | null>(null)

  function exportProject() {
    const json = serializeProject({ reviewers, papers, settings, run, assignments, lockedPapers, auditLog, runHistory })
    downloadText('reviewer-match.matchproj', json, 'application/json')
  }

  async function onProjectFile(file: File) {
    const result = parseProject(await file.text())
    if (!result.ok) {
      setMessage(`⚠️ ${result.error}`)
      return
    }
    loadProject(result.project)
    setMessage(`✓ Loaded project: ${result.project.reviewers.length} reviewers, ${result.project.papers.length} papers.`)
    setReport(null)
  }

  async function onResultsFile(file: File) {
    if (reviewers.length === 0 || papers.length === 0) {
      setMessage('⚠️ Load reviewers and papers first — results are matched against them by name.')
      return
    }
    const rep = importResultsCsv(await file.text(), reviewers, papers, run)
    commitAssignments(rep.assignments, 'import-results', `Imported ${rep.assignments.length} assignments from CSV`)
    setReport(rep)
    setMessage(null)
  }

  return (
    <div className="projectbar">
      <button className="btn btn--ghost" onClick={exportProject} disabled={reviewers.length === 0 && papers.length === 0}>
        Export project (.matchproj)
      </button>

      <label htmlFor="proj-import" className="btn btn--file">
        Import project
      </label>
      <input
        id="proj-import"
        type="file"
        accept=".matchproj,.json,application/json"
        aria-label="Import project"
        className="upload-card__input"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onProjectFile(f)
        }}
      />

      <label htmlFor="results-import" className="btn btn--file">
        Import results CSV
      </label>
      <input
        id="results-import"
        type="file"
        accept=".csv,text/csv"
        aria-label="Import results CSV"
        className="upload-card__input"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onResultsFile(f)
        }}
      />

      {message && <p className="projectbar__msg">{message}</p>}

      {report && (
        <div className="projectbar__report">
          ✓ Imported {report.assignments.length} assignments ({report.matchedPapers} papers,{' '}
          {report.matchedReviewers} reviewers).
          {report.unresolvedPapers.length > 0 && (
            <div>⚠️ Unmatched columns: {report.unresolvedPapers.join(', ')}</div>
          )}
          {report.unresolvedReviewers.length > 0 && (
            <div>
              ⚠️ Unmatched reviewer names ({report.unresolvedReviewers.length}):{' '}
              {report.unresolvedReviewers.slice(0, 8).join(', ')}
              {report.unresolvedReviewers.length > 8 ? '…' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
