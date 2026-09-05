import type { SynthOutput } from './synthetic'

export type HistoryPayload = {
  members: string[]
  sessions: { name: string; issues: { key: string; summary: string; order_idx: number; final_sp: number }[]; votes: { key: string; member: string; card: string; round: number }[] }[]
}

export function toHistoryPayload(out: SynthOutput): HistoryPayload {
  const summary = new Map(out.jiraRows.map((r) => [r.key, r.summary]))
  const votesByIssue = new Map<string, typeof out.votes>()
  for (const v of out.votes) {
    const g = votesByIssue.get(v.issueId) ?? []
    g.push(v)
    votesByIssue.set(v.issueId, g)
  }
  return {
    members: [...new Set(out.votes.map((v) => v.memberId))],
    sessions: out.sessions.map((s) => ({
      name: s.name,
      issues: s.issueIds.map((id, idx) => ({ key: id, summary: summary.get(id) ?? '', order_idx: idx, final_sp: out.finalSp.get(id) as number })),
      votes: s.issueIds.flatMap((id) => (votesByIssue.get(id) ?? []).map((v) => ({ key: id, member: v.memberId, card: v.card, round: v.round }))),
    })),
  }
}
