import type { Paper, Reviewer } from '../domain/types'

/** A field the importer can map a column onto. */
export interface FieldSpec {
  key: string
  label: string
  required?: boolean
  /** Header names that should auto-map to this field (lowercased). */
  aliases: string[]
  /** What the column should contain (shown in the import guide + review modal). */
  hint: string
  /** A realistic example value. */
  example: string
}

export const REVIEWER_FIELDS: FieldSpec[] = [
  {
    key: 'id',
    label: 'ID',
    required: true,
    aliases: ['id', 'reviewer id', 'reviewerid'],
    hint: 'Any unique value per reviewer: a number or short code. Only used to tell rows apart.',
    example: 'R17',
  },
  {
    key: 'name',
    label: 'Name',
    aliases: ['name', 'reviewer', 'full name'],
    hint: 'Full name, "First Last" or "Last, First". Must be spelled the same way as in the papers\' Authors column so own-paper conflicts are caught (initials or abbreviations won\'t match).',
    example: 'Vega, Rowan',
  },
  {
    key: 'role',
    label: 'Role',
    aliases: ['role', 'type'],
    hint: 'student or professor (any capitalization). Anything else counts as "other" and uses the default load from Configure.',
    example: 'professor',
  },
  {
    key: 'criteria',
    label: 'Specialties / criteria',
    aliases: ['criteria', 'specialties', 'specialty', 'keywords', 'expertise'],
    hint: 'Free text describing expertise: topics, methods, keywords. This is the main matching signal, so richer is better.',
    example: 'reading comprehension; multilingual learners; mixed methods',
  },
  {
    key: 'criteria2',
    label: 'More criteria (e.g. publications)',
    aliases: ['publications', 'papers', 'bio', 'research'],
    hint: 'Optional extra matching signal, e.g. recent publication titles or a short bio. Combined with Specialties.',
    example: 'Scaffolding reading in dual-language classrooms (2024)',
  },
  {
    key: 'institution',
    label: 'Institution',
    aliases: ['institution', 'affiliation'],
    hint: 'Optional, free text, shown for reference only. It is not used for matching or conflicts, so names, abbreviations, or sub-programs are all fine.',
    example: 'Univ. of Michigan, School of Ed.',
  },
]

export const PAPER_FIELDS: FieldSpec[] = [
  {
    key: 'id',
    label: 'ID',
    required: true,
    aliases: ['id', 'paper id', 'paperid'],
    hint: 'Any unique value per paper: a number or short code. Shown on the board and in exports.',
    example: 'P42',
  },
  {
    key: 'title',
    label: 'Title',
    aliases: ['title', 'paper title'],
    hint: 'The paper title, free text. Part of the matching signal.',
    example: 'Design-Based Research on Engagement in Online Courses',
  },
  {
    key: 'abstract',
    label: 'Abstract',
    aliases: ['abstract', 'summary'],
    hint: 'The abstract or a summary, free text. The strongest matching signal; include it if you have it.',
    example: 'This study examines how…',
  },
  {
    key: 'keywords',
    label: 'Keywords',
    aliases: ['keywords', 'descriptors', 'topics'],
    hint: 'Topic keywords in any format (comma, semicolon, or space separated). Part of the matching signal.',
    example: 'online learning; engagement; design-based research',
  },
  {
    key: 'method',
    label: 'Method',
    aliases: ['method', 'methodology'],
    hint: 'Methodology, e.g. Qualitative, Quantitative, Mixed Methods. Used by the method-match boost in Configure.',
    example: 'Qualitative',
  },
  {
    key: 'authors',
    label: 'Authors',
    aliases: ['authors', 'author'],
    hint: 'Author names in one cell, any separator. Spell names as they appear in the reviewer list ("First Last" and "Last, First" both work) so authors are never assigned their own paper.',
    example: 'Rowan Vega; Sunil Ibarra',
  },
]

/** fieldKey -> column index (-1 = not mapped). */
export type ColumnMapping = Record<string, number>

/**
 * Split a table into header labels and data rows. When the first row is treated
 * as a header, its cells are the labels; otherwise labels are "Column N".
 */
export function tableHeaders(rows: string[][], firstRowIsHeader: boolean): string[] {
  const width = rows.reduce((max, r) => Math.max(max, r.length), 0)
  if (firstRowIsHeader && rows.length > 0) {
    return Array.from({ length: width }, (_, i) => rows[0][i]?.trim() || `Column ${i + 1}`)
  }
  return Array.from({ length: width }, (_, i) => `Column ${i + 1}`)
}

export function dataRows(rows: string[][], firstRowIsHeader: boolean): string[][] {
  return firstRowIsHeader ? rows.slice(1) : rows
}

/**
 * Heuristic: treat the first row as a header when its cells look like labels
 * (short, non-numeric) and match known aliases better than they look like data.
 */
export function looksLikeHeader(rows: string[][], fields: FieldSpec[]): boolean {
  if (rows.length === 0) return false
  const first = rows[0].map((c) => c.trim().toLowerCase())
  const aliasHits = first.filter((cell) =>
    fields.some((f) => f.aliases.includes(cell)),
  ).length
  const anyNumericId = /^\d+$/.test(first[0] ?? '')
  return aliasHits >= 1 && !anyNumericId
}

/** Auto-map fields to columns by header alias, else by conventional position. */
export function guessMapping(
  fields: FieldSpec[],
  headers: string[],
  firstRowIsHeader: boolean,
): ColumnMapping {
  const mapping: ColumnMapping = {}
  const lowered = headers.map((h) => h.trim().toLowerCase())
  fields.forEach((field, position) => {
    if (firstRowIsHeader) {
      const idx = lowered.findIndex((h) => field.aliases.includes(h))
      mapping[field.key] = idx
    } else {
      // No header: fall back to declared field order (id, title, abstract, …).
      mapping[field.key] = position < headers.length ? position : -1
    }
  })
  return mapping
}

/**
 * A starter CSV: one header row (using alias names, so re-uploading the filled
 * template auto-maps every column) plus one example row.
 */
export function templateCsv(fields: FieldSpec[]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const headers = fields.map((f) => f.aliases[0])
  const example = fields.map((f) => f.example)
  return [headers.map(esc).join(','), example.map(esc).join(',')].join('\n')
}

function cell(row: string[], idx: number): string {
  return idx >= 0 ? (row[idx] ?? '').trim() : ''
}

export function buildReviewers(
  rows: string[][],
  mapping: ColumnMapping,
): { rows: Reviewer[]; warnings: string[] } {
  const warnings: string[] = []
  const out: Reviewer[] = []
  rows.forEach((row, i) => {
    const id = cell(row, mapping.id)
    if (!id) {
      warnings.push(`Reviewer row ${i + 1} has no id, skipped.`)
      return
    }
    const name = cell(row, mapping.name) || id
    // Combine the primary criteria column with an optional second (e.g.
    // publications) for a richer matching signal.
    const criteria = [cell(row, mapping.criteria), cell(row, mapping.criteria2)]
      .filter(Boolean)
      .join('\n')
    if (!criteria) warnings.push(`Reviewer "${name}" has no criteria, may be hard to match.`)
    out.push({
      id,
      name,
      role: (cell(row, mapping.role) || 'other').toLowerCase(),
      criteria,
      institution: cell(row, mapping.institution) || undefined,
    })
  })
  return { rows: out, warnings }
}

export function buildPapers(
  rows: string[][],
  mapping: ColumnMapping,
): { rows: Paper[]; warnings: string[] } {
  const warnings: string[] = []
  const out: Paper[] = []
  rows.forEach((row, i) => {
    const id = cell(row, mapping.id)
    if (!id) {
      warnings.push(`Paper row ${i + 1} has no id, skipped.`)
      return
    }
    const title = cell(row, mapping.title)
    const abstract = cell(row, mapping.abstract)
    const keywords = cell(row, mapping.keywords)
    if (!title && !abstract && !keywords) {
      warnings.push(`Paper "${id}" has no text, may be hard to match.`)
    }
    out.push({
      id,
      title,
      abstract,
      keywords,
      method: cell(row, mapping.method),
      authors: cell(row, mapping.authors),
    })
  })
  return { rows: out, warnings }
}
