import Papa from 'papaparse'

/** A raw tabular file as rows of string cells (no header interpretation yet). */
export interface Table {
  rows: string[][]
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/** Parse delimited text into rows. Papaparse handles quoted embedded newlines. */
export function parseDelimited(text: string): string[][] {
  const parsed = Papa.parse<string[]>(stripBom(text), {
    skipEmptyLines: 'greedy',
    // Let papaparse auto-detect the delimiter (some files use ';').
  })
  return (parsed.data as string[][]).map((r) => r.map((c) => (c ?? '').toString()))
}

/** Read an uploaded CSV or XLSX file into rows of strings. */
export async function readTable(file: File): Promise<Table> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    // Lazy-load SheetJS only when an Excel file is actually opened, keeping it
    // out of the initial bundle (the common path is CSV).
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils
      .sheet_to_json<string[]>(sheet, { header: 1, blankrows: false, defval: '' })
      .map((r) => (r as unknown[]).map((c) => (c ?? '').toString()))
    return { rows }
  }
  return { rows: parseDelimited(await file.text()) }
}
