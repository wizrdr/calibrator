import { matchImport } from './importFacts'
import { parseJiraDate } from './jiraCsv'
import type { JiraRow } from './jiraCsv'

const row = (key: string, extra: Partial<JiraRow> = {}): JiraRow => ({
  key, summary: '', status: 'Done', sp: null, timeSpentSec: null, sprints: [], resolved: null, ...extra,
})

describe('matchImport', () => {
  const issues = [
    { id: 'a', key: 'CAL-1' },
    { id: 'b', key: 'CAL-2' },
    { id: 'c', key: 'CAL-3' },
  ]

  it('matches rows to issues by key and reports coverage over estimated issues', () => {
    const r = matchImport(
      [row('CAL-1', { timeSpentSec: 7200, sp: 3 }), row('cal-2 ', { timeSpentSec: null }), row('CAL-9', { timeSpentSec: 100 })],
      issues,
    )
    expect(r.matched.map((m) => m.issueId)).toEqual(['a', 'b'])
    expect(r.withFact).toBe(1)
    expect(r.unmatchedKeys).toEqual(['CAL-9'])
    expect(r.missingKeys).toEqual(['CAL-3'])
    expect(r.coverage).toBeCloseTo(1 / 3)
  })

  it('takes the last row when a key repeats', () => {
    const r = matchImport([row('CAL-1', { timeSpentSec: 10 }), row('CAL-1', { timeSpentSec: 20 })], issues)
    expect(r.matched).toHaveLength(1)
    expect(r.matched[0].row.timeSpentSec).toBe(20)
  })
})

describe('parseJiraDate', () => {
  it('reads the Jira export format and returns ISO', () => {
    expect(parseJiraDate('05/Sep/26 10:12 AM')).toBe('2026-09-05T10:12:00.000Z')
    expect(parseJiraDate('04/Sep/26 6:30 PM')).toBe('2026-09-04T18:30:00.000Z')
    expect(parseJiraDate('12/Dec/25 12:05 AM')).toBe('2025-12-12T00:05:00.000Z')
  })

  it('returns null for empty or unknown text', () => {
    expect(parseJiraDate(null)).toBeNull()
    expect(parseJiraDate('yesterday')).toBeNull()
  })
})
