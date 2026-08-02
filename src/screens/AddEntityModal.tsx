import { useMemo, useState } from 'react'
import { useModalKeys } from './useModal'
import type { ColumnMapping, FieldSpec } from '../io/mapping'

interface AddEntityModalProps<T> {
  /** Singular noun for titles/labels, e.g. "reviewer" or "paper". */
  noun: string
  fields: FieldSpec[]
  /** Existing ids, to keep the new one unique and suggest the next. */
  existingIds: string[]
  /** Prefix for the auto-suggested id, e.g. "R" or "P". */
  idPrefix: string
  /** Reuse the CSV builders so field-combining/validation stays identical. */
  build: (rows: string[][], mapping: ColumnMapping) => { rows: T[]; warnings: string[] }
  onAdd: (row: T) => void
  onClose: () => void
  /** Shown as a caution banner (e.g. "adding will clear the current match"). */
  warning?: string
  /** Edit mode: prefill with this item's values; its own id stays allowed. */
  initial?: Record<string, string>
}

/** Next unused id like "R9": the highest existing <prefix><n> plus one. */
function suggestId(existingIds: string[], prefix: string): string {
  let max = 0
  const re = new RegExp(`^${prefix}(\\d+)$`, 'i')
  for (const id of existingIds) {
    const m = id.match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}${max + 1}`
}

/**
 * A small form for adding a single reviewer or paper by hand — the "one late
 * addition" case that doesn't warrant re-exporting the whole CSV. Builds the
 * record through the same builder the importer uses, so combining rules and
 * warnings are consistent.
 */
export function AddEntityModal<T>({
  noun,
  fields,
  existingIds,
  idPrefix,
  build,
  onAdd,
  onClose,
  warning,
  initial,
}: AddEntityModalProps<T>) {
  const editing = initial != null
  // In edit mode the item's own id doesn't count as a collision.
  const existing = useMemo(
    () =>
      new Set(
        existingIds
          .filter((i) => !(editing && i.toLowerCase() === initial.id?.toLowerCase()))
          .map((i) => i.toLowerCase()),
      ),
    [existingIds, editing, initial],
  )
  const [values, setValues] = useState<Record<string, string>>(() =>
    initial ?? { id: suggestId(existingIds, idPrefix) },
  )
  const [error, setError] = useState<string | null>(null)

  const set = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }))
  const modalRef = useModalKeys(onClose)

  function submit() {
    const id = (values.id ?? '').trim()
    if (!id) {
      setError('An ID is required.')
      return
    }
    if (existing.has(id.toLowerCase())) {
      setError(`ID "${id}" is already in use — pick a unique one.`)
      return
    }
    // Assemble a one-row table in field order, plus a positional mapping, and
    // run it through the shared builder.
    const row = fields.map((f) => (values[f.key] ?? '').trim())
    const mapping: ColumnMapping = {}
    fields.forEach((f, i) => {
      mapping[f.key] = i
    })
    const { rows } = build([row], mapping)
    if (rows.length === 0) {
      setError(`This ${noun} is missing required information.`)
      return
    }
    onAdd(rows[0])
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={editing ? `Edit ${noun}` : `Add ${noun}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <strong>{editing ? `Edit ${noun}` : `Add ${noun}`}</strong>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal__body">
          {warning && <p className="add-form__warning">⚠️ {warning}</p>}
          <form
            className="add-form"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            {fields.map((f) => (
              <label className="settings-field add-form__field" key={f.key}>
                <span>
                  {f.label}
                  {f.required && <span className="add-form__req"> *</span>}
                </span>
                {f.key === 'id' || f.key === 'name' || f.key === 'title' || f.key === 'role' ? (
                  <input
                    type="text"
                    value={values[f.key] ?? ''}
                    placeholder={f.example}
                    aria-label={f.label}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                ) : (
                  <textarea
                    className="add-form__textarea"
                    rows={2}
                    value={values[f.key] ?? ''}
                    placeholder={f.example}
                    aria-label={f.label}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
                {f.hint && <span className="add-form__hint muted">{f.hint}</span>}
              </label>
            ))}
            {error && <p className="add-form__error">{error}</p>}
          </form>
        </div>
        <div className="modal__foot">
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            {editing ? 'Save changes' : `Add ${noun}`}
          </button>
        </div>
      </div>
    </div>
  )
}
