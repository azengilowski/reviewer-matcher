// @vitest-environment node
// Node's File (undici) implements .text()/.arrayBuffer(); jsdom's does not.
import * as XLSX from 'xlsx'
import { readTable } from './readTable'

describe('readTable', () => {
  it('reads an XLSX file into rows of strings', async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['id', 'name'],
      ['R1', 'Jane'],
      ['R2', 'Bob'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    const file = new File([buf], 'reviewers.xlsx')

    const table = await readTable(file)
    expect(table.rows[0]).toEqual(['id', 'name'])
    expect(table.rows[1]).toEqual(['R1', 'Jane'])
    expect(table.rows).toHaveLength(3)
  })

  it('reads a CSV file into rows', async () => {
    const file = new File(['id,name\nR1,Jane\n'], 'reviewers.csv', { type: 'text/csv' })
    const table = await readTable(file)
    expect(table.rows[0]).toEqual(['id', 'name'])
    expect(table.rows[1]).toEqual(['R1', 'Jane'])
  })
})
