import { hoursPerSp, impliedSp, personBias, teamCurve } from './calibration'
import type { Card } from './scale'
import type { Bias, CurvePoint, FactIssue, Scale, VoteRec } from './types'

// Row shapes as they come from the database, narrowed to what the report needs.
export type IssueRow = {
  id: string
  session_id: string
  key: string
  summary: string
  final_sp: number | null
  jira_sp: number | null
  time_spent_sec: number | null
  sprints: string[] | null
  status: string | null
  exclude_reason: string | null
}
export type VoteRow = { issue_id: string; participant_id: string; round: number; card: string }
export type ParticipantRow = { id: string; display_name: string; member_id: string | null }
export type MemberRow = { id: string; name: string }
export type SessionRow = { id: string; sprint_name: string; created_at: string }

export type Miss = { key: string; summary: string; finalSp: number; impliedSp: number; hours: number }
export type Drift = { key: string; summary: string; first: number; last: number }

export type Report = {
  estimated: number
  withFact: number
  coverage: number
  scale: Scale
  curve: CurvePoint[]
  biasVsFact: Bias[]
  biasVsFinal: Bias[]
  names: Map<string, string>
  carryOver: { count: number; hoursShare: number; keys: string[] }
  topMisses: Miss[]
  drift: Drift[]
  unresolvedWithEstimate: string[]
}

export type ReportOpts = { round?: 'first' | 'last' }

const DONE = /^(done|closed|resolved|готово|закрыт)/i

export function toFactIssues(issues: readonly IssueRow[], sessions: readonly SessionRow[]): FactIssue[] {
  const order = new Map(sessions.map((s) => [s.id, s.created_at]))
  // A key estimated in several sessions counts once, by its first estimate.
  const firstByKey = new Map<string, IssueRow>()
  for (const i of [...issues].sort((a, b) => (order.get(a.session_id) ?? '').localeCompare(order.get(b.session_id) ?? ''))) {
    if (!firstByKey.has(i.key)) firstByKey.set(i.key, i)
  }
  return [...firstByKey.values()].map((i) => {
    const sp = i.final_sp ?? i.jira_sp ?? 0
    const resolved = i.status === null || DONE.test(i.status)
    return {
      issueId: i.id,
      key: i.key,
      sp,
      hours: i.time_spent_sec && resolved ? i.time_spent_sec / 3600 : null,
      sprints: i.sprints ?? [],
      excluded: i.exclude_reason !== null,
    }
  })
}

export function memberKey(p: ParticipantRow): string {
  return p.member_id ?? `name:${p.display_name}`
}

export function toVoteRecs(votes: readonly VoteRow[], participants: readonly ParticipantRow[]): VoteRec[] {
  const byId = new Map(participants.map((p) => [p.id, memberKey(p)]))
  return votes.flatMap((v) => {
    const memberId = byId.get(v.participant_id)
    return memberId ? [{ issueId: v.issue_id, memberId, card: v.card as Card, round: v.round }] : []
  })
}

export function buildReport(
  rows: { issues: IssueRow[]; votes: VoteRow[]; participants: ParticipantRow[]; members: MemberRow[]; sessions: SessionRow[] },
  opts: ReportOpts = {},
): Report {
  const facts = toFactIssues(rows.issues, rows.sessions)
  const estimated = facts.filter((f) => f.sp > 0)
  const withFact = estimated.filter((f) => f.hours !== null && !f.excluded)
  const scale = hoursPerSp(facts)
  const curve = teamCurve(facts)

  // Votes on later re-estimates of the same key are re-pointed to the first issue row.
  const idByKey = new Map(facts.map((f) => [f.key, f.issueId]))
  const keyById = new Map(rows.issues.map((i) => [i.id, i.key]))
  const votes = toVoteRecs(rows.votes, rows.participants).map((v) => ({
    ...v,
    issueId: idByKey.get(keyById.get(v.issueId) ?? '') ?? v.issueId,
  }))

  const refFact = new Map<string, number>()
  for (const f of withFact) refFact.set(f.issueId, impliedSp(f.hours as number, scale.k))
  const refFinal = new Map<string, number>()
  for (const f of estimated) refFinal.set(f.issueId, f.sp)

  const names = new Map<string, string>()
  for (const m of rows.members) names.set(m.id, m.name)
  for (const p of rows.participants) if (!p.member_id) names.set(memberKey(p), p.display_name)

  const carried = withFact.filter((f) => f.sprints.length > 1)
  const totalHours = withFact.reduce((s, f) => s + (f.hours as number), 0)
  const carriedHours = carried.reduce((s, f) => s + (f.hours as number), 0)

  const summaryById = new Map(rows.issues.map((i) => [i.id, i.summary]))
  const topMisses: Miss[] = withFact
    .map((f) => ({
      key: f.key,
      summary: summaryById.get(f.issueId) ?? '',
      finalSp: f.sp,
      impliedSp: impliedSp(f.hours as number, scale.k),
      hours: f.hours as number,
    }))
    .sort((a, b) => Math.abs(Math.log(b.finalSp / b.impliedSp)) - Math.abs(Math.log(a.finalSp / a.impliedSp)))
    .slice(0, 5)

  const order = new Map(rows.sessions.map((s) => [s.id, s.created_at]))
  const byKey = new Map<string, IssueRow[]>()
  for (const i of rows.issues) {
    if (i.final_sp === null) continue
    const g = byKey.get(i.key) ?? []
    g.push(i)
    byKey.set(i.key, g)
  }
  const drift: Drift[] = [...byKey.entries()]
    .filter(([, g]) => g.length > 1)
    .map(([key, g]) => {
      const sorted = [...g].sort((a, b) => (order.get(a.session_id) ?? '').localeCompare(order.get(b.session_id) ?? ''))
      return { key, summary: sorted[0].summary, first: sorted[0].final_sp as number, last: sorted[sorted.length - 1].final_sp as number }
    })
    .filter((d) => d.first !== d.last)

  return {
    estimated: estimated.length,
    withFact: withFact.length,
    coverage: estimated.length === 0 ? 0 : withFact.length / estimated.length,
    scale,
    curve,
    biasVsFact: personBias(votes, refFact, { round: opts.round }),
    biasVsFinal: personBias(votes, refFinal, { round: opts.round }),
    names,
    carryOver: { count: carried.length, hoursShare: totalHours === 0 ? 0 : carriedHours / totalHours, keys: carried.map((f) => f.key) },
    topMisses,
    drift,
    unresolvedWithEstimate: estimated.filter((f) => f.hours === null && !f.excluded).map((f) => f.key),
  }
}
