import { FIB, snapToFib, type Card } from './scale'
import { median } from './stats'
import type { FactIssue, VoteRec } from './types'
import type { JiraRow } from './jiraCsv'

export type SynthPerson = { name: string; bias: number; sigma: number }

export type SynthParams = {
  sprints: number
  issuesPerSprint: number
  k: number
  sigmaIssue: number
  people: SynthPerson[]
  spWeights?: Partial<Record<(typeof FIB)[number], number>>
  missingFactRate?: number
  abstainRate?: number
  carryOverRate?: number
  seed: number
}

export type SynthSession = { name: string; issueIds: string[] }

export type SynthOutput = {
  issues: FactIssue[]
  votes: VoteRec[]
  finalSp: Map<string, number>
  sessions: SynthSession[]
  jiraRows: JiraRow[]
}

const DEFAULT_WEIGHTS: Record<(typeof FIB)[number], number> = { 1: 1, 2: 2, 3: 3, 5: 3, 8: 2, 13: 1 }

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function normal(rand: () => number): number {
  const u = 1 - rand()
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function pickWeighted(rand: () => number, weights: Record<number, number>): number {
  const entries = Object.entries(weights).map(([sp, w]) => [Number(sp), w] as const)
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rand() * total
  for (const [sp, w] of entries) {
    r -= w
    if (r <= 0) return sp
  }
  return entries[entries.length - 1][0]
}

export function generateSynthetic(p: SynthParams): SynthOutput {
  const rand = mulberry32(p.seed)
  const weights = { ...DEFAULT_WEIGHTS, ...p.spWeights }
  const missingFactRate = p.missingFactRate ?? 0
  const abstainRate = p.abstainRate ?? 0
  const carryOverRate = p.carryOverRate ?? 0

  const issues: FactIssue[] = []
  const votes: VoteRec[] = []
  const finalSp = new Map<string, number>()
  const sessions: SynthSession[] = []
  const jiraRows: JiraRow[] = []
  let n = 0

  for (let s = 1; s <= p.sprints; s++) {
    const sprintName = `Sprint ${s}`
    const session: SynthSession = { name: sprintName, issueIds: [] }
    for (let i = 0; i < p.issuesPerSprint; i++) {
      n += 1
      const issueId = `CAL-${n}`
      const trueSp = pickWeighted(rand, weights)
      const hours = p.k * trueSp * Math.exp(normal(rand) * p.sigmaIssue)
      const cards: Card[] = p.people.map((person) => {
        if (rand() < abstainRate) return rand() < 0.5 ? '?' : 'coffee'
        return String(snapToFib(trueSp * person.bias * Math.exp(normal(rand) * person.sigma))) as Card
      })
      const numeric = cards.filter((c) => c !== '?' && c !== 'coffee').map(Number)
      const final = numeric.length > 0 ? snapToFib(median(numeric)) : trueSp
      const carried = rand() < carryOverRate && s < p.sprints
      const sprints = carried ? [sprintName, `Sprint ${s + 1}`] : [sprintName]
      const hasFact = rand() >= missingFactRate

      issues.push({ issueId, key: issueId, sp: final, hours: hasFact ? hours : null, sprints, excluded: false })
      finalSp.set(issueId, final)
      session.issueIds.push(issueId)
      p.people.forEach((person, idx) => votes.push({ issueId, memberId: person.name, card: cards[idx], round: 1 }))
      jiraRows.push({
        key: issueId,
        summary: `Synthetic issue ${n}`,
        status: 'Done',
        sp: final,
        timeSpentSec: hasFact ? Math.round(hours * 3600) : null,
        sprints,
        resolved: null,
      })
    }
    sessions.push(session)
  }
  return { issues, votes, finalSp, sessions, jiraRows }
}
