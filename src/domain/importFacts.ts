import type { JiraRow } from './jiraCsv'

export type ImportMatch = { issueId: string; row: JiraRow }

export type ImportPreview = {
  matched: ImportMatch[]
  withFact: number
  unmatchedKeys: string[]
  missingKeys: string[]
  coverage: number
}

const norm = (k: string) => k.trim().toUpperCase()

export function matchImport(rows: readonly JiraRow[], issues: readonly { id: string; key: string }[]): ImportPreview {
  const byKey = new Map(issues.map((i) => [norm(i.key), i.id]))
  const lastRow = new Map<string, JiraRow>()
  for (const r of rows) lastRow.set(norm(r.key), r)

  const matched: ImportMatch[] = []
  const unmatchedKeys: string[] = []
  for (const [key, row] of lastRow) {
    const id = byKey.get(key)
    if (id) matched.push({ issueId: id, row })
    else unmatchedKeys.push(row.key.trim())
  }
  const matchedKeys = new Set(matched.map((m) => norm(m.row.key)))
  const missingKeys = issues.filter((i) => !matchedKeys.has(norm(i.key))).map((i) => i.key)
  const withFact = matched.filter((m) => (m.row.timeSpentSec ?? 0) > 0).length
  return {
    matched,
    withFact,
    unmatchedKeys,
    missingKeys,
    coverage: issues.length === 0 ? 0 : withFact / issues.length,
  }
}
