export type JiraRow = {
  key: string
  summary: string
  status: string
  sp: number | null
  timeSpentSec: number | null
  sprints: string[]
  resolved: string | null
}

const SP_HEADERS = ['Custom field (Story Points)', 'Story point estimate', 'Story Points']

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += ch
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

function num(s: string | undefined): number | null {
  if (s === undefined || s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function parseJiraCsv(text: string): JiraRow[] {
  const [header, ...lines] = parseCsv(text)
  if (!header) return []
  const col = (name: string) => header.indexOf(name)
  const keyIdx = col('Issue key')
  if (keyIdx < 0) throw new Error('CSV has no "Issue key" column')
  const spIdx = SP_HEADERS.map(col).find((i) => i >= 0) ?? -1
  const summaryIdx = col('Summary')
  const statusIdx = col('Status')
  const timeIdx = col('Time Spent')
  const resolvedIdx = col('Resolved')
  const sprintIdxs = header.flatMap((h, i) => (h === 'Sprint' ? [i] : []))

  return lines
    .filter((cells) => cells.some((c) => c.trim() !== ''))
    .map((cells) => ({
      key: cells[keyIdx] ?? '',
      summary: cells[summaryIdx] ?? '',
      status: cells[statusIdx] ?? '',
      sp: num(cells[spIdx]),
      timeSpentSec: num(cells[timeIdx]),
      sprints: sprintIdxs.map((i) => cells[i] ?? '').filter((s) => s !== ''),
      resolved: cells[resolvedIdx] ? cells[resolvedIdx] : null,
    }))
}

function quote(s: string): string {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toJiraCsv(rows: readonly JiraRow[]): string {
  const sprintCols = Math.max(1, ...rows.map((r) => r.sprints.length))
  const header = [
    'Summary',
    'Issue key',
    'Status',
    'Custom field (Story Points)',
    'Time Spent',
    ...Array<string>(sprintCols).fill('Sprint'),
    'Resolved',
  ]
  const lines = rows.map((r) =>
    [
      r.summary,
      r.key,
      r.status,
      r.sp === null ? '' : String(r.sp),
      r.timeSpentSec === null ? '' : String(r.timeSpentSec),
      ...Array.from({ length: sprintCols }, (_, i) => r.sprints[i] ?? ''),
      r.resolved ?? '',
    ]
      .map(quote)
      .join(','),
  )
  return [header.join(','), ...lines].join('\n') + '\n'
}
