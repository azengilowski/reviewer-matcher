import { useMemo, useState } from 'react'
import {
  dataRows,
  guessMapping,
  looksLikeHeader,
  tableHeaders,
  type ColumnMapping,
  type FieldSpec,
} from '../io/mapping'
import { readTable } from '../io/readTable'

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

export function ImportWizard<T>({ label, fields, storageKey, build, onImport }: ImportWizardProps<T>) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [firstRowHeader, setFirstRowHeader] = useState(true)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [dragOver, setDragOver] = useState(false)

  const headers = useMemo(() => tableHeaders(rawRows, firstRowHeader), [rawRows, firstRowHeader])
  const body = useMemo(() => dataRows(rawRows, firstRowHeader), [rawRows, firstRowHeader])
  const preview = useMemo(() => build(body.slice(0, 5), mapping), [build, body, mapping])
  const fullWarnings = useMemo(() => build(body, mapping).warnings, [build, body, mapping])

  async function onFile(file: File) {
    const table = await readTable(file)
    const hasHeader = looksLikeHeader(table.rows, fields)
    const hdrs = tableHeaders(table.rows, hasHeader)
    setFileName(file.name)
    setRawRows(table.rows)
    setFirstRowHeader(hasHeader)
    setMapping(loadRemembered(storageKey) ?? guessMapping(fields, hdrs, hasHeader))
  }

  function toggleHeader(next: boolean) {
    setFirstRowHeader(next)
    setMapping(guessMapping(fields, tableHeaders(rawRows, next), next))
  }

  function setField(key: string, col: number) {
    setMapping((m) => ({ ...m, [key]: col }))
  }

  function doImport() {
    const built = build(body, mapping)
    try {
      localStorage.setItem(storageKey, JSON.stringify(mapping))
    } catch {
      /* storage may be unavailable; mapping just won't be remembered */
    }
    onImport(built.rows, built.warnings)
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

      {rawRows.length > 0 && (
        <>
          <label className="import__headertoggle">
            <input
              type="checkbox"
              checked={firstRowHeader}
              onChange={(e) => toggleHeader(e.target.checked)}
            />{' '}
            First row is a header
          </label>

          <div className="import__fields">
            {fields.map((f) => (
              <label key={f.key} className="import__field">
                <span>
                  {f.label}
                  {f.required && <span className="import__req"> *</span>}
                </span>
                <select
                  value={mapping[f.key] ?? -1}
                  aria-label={`Map ${label} ${f.label}`}
                  onChange={(e) => setField(f.key, Number(e.target.value))}
                >
                  <option value={-1}>(none)</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <table className="import__preview">
            <thead>
              <tr>
                {fields.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, i) => (
                <tr key={i}>
                  {fields.map((f) => (
                    <td key={f.key}>
                      {String((row as Record<string, unknown>)[f.key] ?? '').slice(0, 60)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="import__actions">
            <button className="btn" onClick={doImport}>
              Import {body.length} {label.toLowerCase()}
            </button>
            {fullWarnings.length > 0 && (
              <span className="import__warncount">⚠️ {fullWarnings.length} warning(s)</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
