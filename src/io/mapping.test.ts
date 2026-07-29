import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildPapers,
  buildReviewers,
  guessMapping,
  looksLikeHeader,
  PAPER_FIELDS,
  REVIEWER_FIELDS,
  tableHeaders,
} from './mapping'
import { parseDelimited } from './readTable'

describe('header detection & mapping', () => {
  const withHeader = [
    ['id', 'name', 'role', 'specialties'],
    ['R1', 'Jane', 'student', 'literacy'],
  ]
  const noHeader = [
    ['2267677', 'A Title', 'An abstract', 'kw', 'Qualitative'],
    ['2269340', 'Another', 'Abstract two', 'kw2', 'Quantitative'],
  ]

  it('detects a header row and maps by alias', () => {
    expect(looksLikeHeader(withHeader, REVIEWER_FIELDS)).toBe(true)
    const headers = tableHeaders(withHeader, true)
    const mapping = guessMapping(REVIEWER_FIELDS, headers, true)
    expect(mapping.id).toBe(0)
    expect(mapping.criteria).toBe(3) // "specialties" aliases to criteria
  })

  it('detects a headerless numeric-id file and maps by position', () => {
    expect(looksLikeHeader(noHeader, PAPER_FIELDS)).toBe(false)
    const headers = tableHeaders(noHeader, false)
    const mapping = guessMapping(PAPER_FIELDS, headers, false)
    expect(mapping.id).toBe(0)
    expect(mapping.title).toBe(1)
    expect(mapping.method).toBe(4)
  })
})

describe('build with validation', () => {
  it('combines two criteria columns (e.g. specialties + publications)', () => {
    const { rows } = buildReviewers(
      [['r1', 'Jane', 'literacy equity', 'Smith 2020 reading study']],
      { id: 0, name: 1, criteria: 2, criteria2: 3 },
    )
    expect(rows[0].criteria).toContain('literacy equity')
    expect(rows[0].criteria).toContain('Smith 2020 reading study')
  })

  it('skips rows without an id and warns', () => {
    const { rows, warnings } = buildReviewers(
      [
        ['', 'No Id'],
        ['R2', 'Has Id'],
      ],
      { id: 0, name: 1 },
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('R2')
    expect(warnings.some((w) => /no id/i.test(w))).toBe(true)
  })
})

describe('messy real-world parsing', () => {
  it('keeps quoted embedded newlines in one cell and strips BOM', () => {
    const text = '﻿123,"line one\nline two",Qualitative\n'
    const rows = parseDelimited(text)
    expect(rows[0][0]).toBe('123') // BOM stripped
    expect(rows[0][1]).toBe('line one\nline two') // newline preserved in-cell
    expect(rows[0][2]).toBe('Qualitative')
  })

  it('imports the real headerless papers_FINAL.csv (BOM + embedded newlines)', () => {
    const path = resolve(
      process.cwd(),
      'Other reviewer assignments/20250812_papers_FINAL.csv',
    )
    const rows = parseDelimited(readFileSync(path, 'utf8'))
    // Headerless, numeric ids in column 0.
    expect(looksLikeHeader(rows, PAPER_FIELDS)).toBe(false)
    const mapping = guessMapping(PAPER_FIELDS, tableHeaders(rows, false), false)
    const { rows: papers } = buildPapers(rows, mapping)
    expect(papers.length).toBeGreaterThanOrEqual(100)
    expect(papers.every((p) => /^\d+$/.test(p.id))).toBe(true)
    expect(papers[0].title.length).toBeGreaterThan(0)
  })
})
