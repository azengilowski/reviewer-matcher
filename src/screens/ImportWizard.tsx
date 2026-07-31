import { useEffect, useMemo, useState } from 'react'
import { downloadText } from '../io/download'
import {
  dataRows,
  guessMapping,
  looksLikeHeader,
  tableHeaders,
  templateCsv,
  type ColumnMapping,
  type FieldSpec,
} from '../io/mapping'
import { readTable } from '../io/readTable'
import { WarningIcon } from './Icons'

interface ImportWizardProps<T> {
  label: string
  fields: FieldSpec[]
  storageKey: string
  build: (rows: string[][], mapping: ColumnMapping) => { rows: T[]; warnings: string[] }
  onImport: (rows: T[], warnings: string[]) => void
}

function loadRemembered(storageKey: string): ColumnMapping | null {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as ColumnMapping) : null
  } catch {
    return null
  }
}

/** Cap the editable preview so huge sheets stay snappy. */
const PREVIEW_ROWS = 50

export function ImportWizard<T>({ label, fields, storageKey, build, onImport }: ImportWizardProps<T>) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [firstRowHeader, setFirstRowHeader] = useState(true)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [dragOver, setDragOver] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const headers = useMemo(() => tableHeaders(rawRows, firstRowHeader), [rawRows, firstRowHeader])
  const body = useMemo(() => dataRows(rawRows, firstRowHeader), [rawRows, firstRowHeader])
  // Full dry-run build: importable row count for the button, warnings for review.
  const fullBuild = useMemo(() => build(body, mapping), [build, body, mapping])

  async function onFile(file: File) {
    const table = await readTable(file)
    const hasHeader = looksLikeHeader(table.rows, fields)
    const hdrs = tableHeaders(table.rows, hasHeader)
    setFileName(file.name)
    setRawRows(table.rows)
    setFirstRowHeader(hasHeader)
    setMapping(loadRemembered(storageKey) ?? guessMapping(fields, hdrs, hasHeader))
    setReviewOpen(true)
  }

  function toggleHeader(next: boolean) {
    setFirstRowHeader(next)
    setMapping(guessMapping(fields, tableHeaders(rawRows, next), next))
  }

  function setField(key: string, col: number) {
    setMapping((m) => ({ ...m, [key]: col }))
  }

  /** Write an edited cell back into the raw table (bodyIndex is header-adjusted). */
  function editCell(bodyIndex: number, col: number, value: string) {
    const abs = firstRowHeader ? bodyIndex + 1 : bodyIndex
    setRawRows((rows) =>
      rows.map((row, i) => {
        if (i !== abs) return row
        const next = row.slice()
        while (next.length <= col) next.push('')
        next[col] = value
        return next
      }),
    )
  }

  function doImport() {
    const built = build(body, mapping)
    try {
      localStorage.setItem(storageKey, JSON.stringify(mapping))
    } catch {
      /* storage may be unavailable; mapping just won't be remembered */
    }
    onImport(built.rows, built.warnings)
    setReviewOpen(false)
  }

  const inputId = `import-${label.toLowerCase()}`
  return (
    <div
      className="import"
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) onFile(file)
      }}
    >
      <div className="import__head">
        <strong>{label}</strong>
        <input
          id={inputId}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls,text/csv"
          aria-label={`${label} file`}
          className="upload-card__input"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
          }}
        />
      </div>
      {/* The whole zone is a drop target and clicking it opens the file picker. */}
      <label
        htmlFor={inputId}
        className={`import__drop${dragOver ? ' import__drop--over' : ''}`}
      >
        <span className="btn btn--file" aria-hidden="true">
          {fileName ? `Change file (${fileName})` : `Choose ${label} file`}
        </span>
        <span className="import__drophint" aria-hidden="true">
          or drop it here
        </span>
      </label>

      {/* What each column should contain, readable before a file is chosen. */}
      <details className="import__guide">
        <summary>What columns do I need?</summary>
        <ul>
          {fields.map((f) => (
            <li key={f.key}>
              <strong>
                {f.label}
                {f.required ? ' (required)' : ''}
              </strong>{' '}
              — {f.hint}{' '}
              <span className="import__guide-example">e.g. “{f.example}”</span>
            </li>
          ))}
        </ul>
        <button
          className="linklike"
          onClick={() =>
            downloadText(`${label.toLowerCase()}-template.csv`, templateCsv(fields), 'text/csv')
          }
        >
          Download a template CSV (headers + one example row)
        </button>
      </details>

      {rawRows.length > 0 && !reviewOpen && (
        <div className="import__status">
          <span className="muted">
            {fileName} · {body.length} rows
          </span>
          <button className="btn btn--ghost btn--sm" onClick={() => setReviewOpen(true)}>
            Review &amp; import…
          </button>
        </div>
      )}

      {reviewOpen && (
        <ReviewModal
          label={label}
          fileName={fileName ?? ''}
          fields={fields}
          headers={headers}
          body={body}
          mapping={mapping}
          firstRowHeader={firstRowHeader}
          importable={fullBuild.rows.length}
          warnings={fullBuild.warnings}
          onToggleHeader={toggleHeader}
          onSetField={setField}
          onEditCell={editCell}
          onImport={doImport}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </div>
  )
}

/** Full-width modal: map columns (with format hints), fix cells in place, import. */
function ReviewModal({
  label,
  fileName,
  fields,
  headers,
  body,
  mapping,
  firstRowHeader,
  importable,
  warnings,
  onToggleHeader,
  onSetField,
  onEditCell,
  onImport,
  onClose,
}: {
  label: string
  fileName: string
  fields: FieldSpec[]
  headers: string[]
  body: string[][]
  mapping: ColumnMapping
  firstRowHeader: boolean
  importable: number
  warnings: string[]
  onToggleHeader: (next: boolean) => void
  onSetField: (key: string, col: number) => void
  onEditCell: (bodyIndex: number, col: number, value: string) => void
  onImport: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const shown = body.slice(0, PREVIEW_ROWS)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal--xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Review ${label} import`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <strong>
            Import {label.toLowerCase()} · <span className="muted">{fileName}</span>
          </strong>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal__body review">
          <label className="import__headertoggle">
            <input
              type="checkbox"
              checked={firstRowHeader}
              onChange={(e) => onToggleHeader(e.target.checked)}
            />{' '}
            First row is a header
          </label>

          <div className="review__fields">
            {fields.map((f) => (
              <div key={f.key} className="review__field">
                <label>
                  <span className="review__fieldlabel">
                    {f.label}
                    {f.required && <span className="import__req"> *</span>}
                  </span>
                  <select
                    value={mapping[f.key] ?? -1}
                    aria-label={`Map ${label} ${f.label}`}
                    onChange={(e) => onSetField(f.key, Number(e.target.value))}
                  >
                    <option value={-1}>(none)</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="review__hint">{f.hint}</p>
              </div>
            ))}
          </div>

          <p className="review__tablenote muted">
            Click any cell to fix it before importing — edits apply to this import only, not your
            original file.
            {body.length > PREVIEW_ROWS &&
              ` Showing the first ${PREVIEW_ROWS} of ${body.length} rows; all rows are imported.`}
          </p>
          <div className="review__tablewrap">
            <table className="review__table">
              <thead>
                <tr>
                  <th className="review__rownum">#</th>
                  {fields.map((f) => (
                    <th key={f.key} className={mapping[f.key] >= 0 ? undefined : 'review__unmapped'}>
                      {f.label}
                      {mapping[f.key] < 0 && <span className="review__unmappedtag"> not mapped</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((row, i) => (
                  <tr key={i}>
                    <td className="review__rownum">{i + 1}</td>
                    {fields.map((f) => {
                      const col = mapping[f.key]
                      if (col < 0) {
                        return (
                          <td key={f.key} className="review__unmapped">
                            —
                          </td>
                        )
                      }
                      return (
                        <td key={f.key}>
                          <input
                            className="review__cell"
                            value={row[col] ?? ''}
                            aria-label={`${f.label}, row ${i + 1}`}
                            onChange={(e) => onEditCell(i, col, e.target.value)}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {warnings.length > 0 && (
            <details className="import__warnings">
              <summary className="import__warncount">
                <WarningIcon /> {warnings.length} warning(s) — click to review
              </summary>
              <ul aria-label={`${label} import warnings`}>
                {warnings.slice(0, 10).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {warnings.length > 10 && (
                  <li className="muted">…and {warnings.length - 10} more</li>
                )}
              </ul>
            </details>
          )}
        </div>

        <div className="modal__foot">
          {importable < body.length && (
            <span className="import__skipnote">
              {body.length - importable} of {body.length} rows will be skipped
            </span>
          )}
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={onImport} disabled={importable === 0}>
            Import {importable} {label.toLowerCase()}
          </button>
        </div>
      </div>
    </div>
  )
}
