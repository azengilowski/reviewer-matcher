import { useState } from 'react'
import { parseProject } from '../io/project'
import { importResultsCsv, type ResolutionReport } from '../io/resultsImport'
import { useApp } from '../state/AppStore'
import { WarningIcon } from './Icons'

export function ProjectBar() {
  const { reviewers, papers, run, loadProject, commitAssignments } = useApp()
  const [message, setMessage] = useState<{ kind: 'warn' | 'ok'; text: string } | null>(null)
  const [report, setReport] = useState<ResolutionReport | null>(null)
  const [dragOver, setDragOver] = useState(false)

  /** Route a dropped file by extension: .matchproj/.json → project, .csv → results. */
  function onDropFile(file: File) {
    const name = file.name.toLowerCase()
    if (name.endsWith('.matchproj') || name.endsWith('.json')) void onProjectFile(file)
    else if (name.endsWith('.csv')) void onResultsFile(file)
    else setMessage({ kind: 'warn', text: `Can't import "${file.name}": drop a .matchproj or results .csv.` })
  }

  async function onProjectFile(file: File) {
    const result = parseProject(await file.text())
    if (!result.ok) {
      setMessage({ kind: 'warn', text: result.error })
      return
    }
    loadProject(result.project)
    setMessage({
      kind: 'ok',
      text: `Loaded project: ${result.project.reviewers.length} reviewers, ${result.project.papers.length} papers.`,
    })
    setReport(null)
  }

  async function onResultsFile(file: File) {
    if (reviewers.length === 0 || papers.length === 0) {
      setMessage({
        kind: 'warn',
        text: 'Load reviewers and papers first: results are matched against them by name.',
      })
      return
    }
    const rep = importResultsCsv(await file.text(), reviewers, papers, run)
    commitAssignments(rep.assignments, 'import-results', `Imported ${rep.assignments.length} assignments from CSV`)
    setReport(rep)
    setMessage(null)
  }

  return (
    <div
      className={`projectbar${dragOver ? ' projectbar--dragover' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) onDropFile(f)
      }}
    >
      <label htmlFor="proj-import" className="btn btn--file">
        Import project (.matchproj)
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

      {message && (
        <p className="projectbar__msg">
          {message.kind === 'warn' ? <WarningIcon /> : '✓'} {message.text}
        </p>
      )}

      {report && (
        <div className="projectbar__report">
          ✓ Imported {report.assignments.length} assignments ({report.matchedPapers} papers,{' '}
          {report.matchedReviewers} reviewers).
          {report.unresolvedPapers.length > 0 && (
            <div>
              <WarningIcon /> Unmatched columns: {report.unresolvedPapers.join(', ')}
            </div>
          )}
          {report.unresolvedReviewers.length > 0 && (
            <div>
              <WarningIcon /> Unmatched reviewer names ({report.unresolvedReviewers.length}):{' '}
              {report.unresolvedReviewers.slice(0, 8).join(', ')}
              {report.unresolvedReviewers.length > 8 ? '…' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
