import { buildReport, type IssueRow, type ParticipantRow, type VoteRow } from './report'

const sessions = [
  { id: 's1', sprint_name: 'S1', created_at: '2026-09-01T00:00:00Z' },
  { id: 's2', sprint_name: 'S2', created_at: '2026-09-15T00:00:00Z' },
]
const members = [{ id: 'm-ann', name: 'Ann' }]
const participants: ParticipantRow[] = [
  { id: 'p1', display_name: 'ann', member_id: 'm-ann' },
  { id: 'p2', display_name: 'Bob', member_id: null },
  { id: 'p3', display_name: 'Ann', member_id: 'm-ann' },
]
const issue = (id: string, session_id: string, key: string, final_sp: number | null, hours: number | null, extra: Partial<IssueRow> = {}): IssueRow => ({
  id, session_id, key, summary: key, final_sp, jira_sp: null, time_spent_sec: hours === null ? null : hours * 3600,
  sprints: ['S1'], status: 'Done', exclude_reason: null, ...extra,
})

// k = 4h/SP exactly: hours = 4 * sp everywhere except the deliberate miss.
const issues: IssueRow[] = [
  issue('i1', 's1', 'K-1', 1, 4),
  issue('i2', 's1', 'K-2', 2, 8),
  issue('i3', 's1', 'K-3', 3, 12),
  issue('i4', 's1', 'K-4', 5, 20),
  issue('i5', 's1', 'K-5', 8, 32),
  issue('i6', 's1', 'K-6', 13, 52, { sprints: ['S1', 'S2'] }),
  issue('i7', 's1', 'K-7', 2, 8),
  issue('i8', 's1', 'K-8', 3, 48),
  issue('i9', 's1', 'K-9', 5, null),
  issue('i6b', 's2', 'K-6', 8, null),
]
const half = ['1', '1', '2', '3', '5', '8', '1', '2']
const votes: VoteRow[] = issues.slice(0, 8).flatMap((i, n) => [
  { issue_id: i.id, participant_id: n < 4 ? 'p1' : 'p3', round: 1, card: half[n] },
  { issue_id: i.id, participant_id: 'p2', round: 1, card: String(i.final_sp) },
])

describe('buildReport', () => {
  const r = buildReport({ issues, votes, participants, members, sessions })

  it('counts coverage over estimated issues, first estimate per key', () => {
    expect(r.estimated).toBe(9)
    expect(r.withFact).toBe(8)
    expect(r.coverage).toBeCloseTo(8 / 9)
  })

  it('merges participants into one member and keeps unmapped names', () => {
    expect(r.names.get('m-ann')).toBe('Ann')
    expect(r.names.get('name:Bob')).toBe('Bob')
    expect(r.biasVsFinal.map((b) => b.memberId).sort()).toEqual(['m-ann', 'name:Bob'])
  })

  it('finds the injected underestimate against fact and the calibrated teammate', () => {
    const ann = r.biasVsFact.find((b) => b.memberId === 'm-ann')!
    const bob = r.biasVsFact.find((b) => b.memberId === 'name:Bob')!
    expect(ann.n).toBe(8)
    expect(ann.factor).toBeLessThan(0.75)
    expect(bob.label).toMatch(/^калиброван/)
  })

  it('reports carry-over, top miss and estimate drift', () => {
    expect(r.carryOver.keys).toEqual(['K-6'])
    expect(r.topMisses[0].key).toBe('K-8')
    expect(r.drift).toEqual([{ key: 'K-6', summary: 'K-6', first: 13, last: 8 }])
    expect(r.unresolvedWithEstimate).toEqual(['K-9'])
  })
})
