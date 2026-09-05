import { cardValue } from './scale'
import { median, medianBand, quantile } from './stats'
import type { Bias, CurvePoint, FactIssue, Scale, Verdict, VoteRec } from './types'

const MIN_N = 8
const MIN_DISTINCT_SP = 3

function usable(issues: readonly FactIssue[]): FactIssue[] {
  return issues.filter((i) => !i.excluded && i.hours !== null && i.hours > 0 && i.sp > 0)
}

export function teamCurve(issues: readonly FactIssue[]): CurvePoint[] {
  const groups = new Map<number, number[]>()
  for (const i of usable(issues)) {
    const g = groups.get(i.sp) ?? []
    g.push(i.hours as number)
    groups.set(i.sp, g)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([sp, hours]) => ({
      sp,
      n: hours.length,
      median: median(hours),
      q1: quantile(hours, 0.25),
      q3: quantile(hours, 0.75),
    }))
}

export function hoursPerSp(issues: readonly FactIssue[]): Scale {
  const rows = usable(issues)
  const distinct = new Set(rows.map((i) => i.sp)).size
  const k = Math.exp(median(rows.map((i) => Math.log((i.hours as number) / i.sp))))
  return { k, n: rows.length, thin: rows.length < MIN_N || distinct < MIN_DISTINCT_SP }
}

export function impliedSp(hours: number, k: number): number {
  return hours / k
}

type BiasOpts = { round?: 'first' | 'last'; minN?: number }

export function personBias(
  votes: readonly VoteRec[],
  ref: ReadonlyMap<string, number>,
  opts: BiasOpts = {},
): Bias[] {
  const round = opts.round ?? 'first'
  const minN = opts.minN ?? MIN_N
  const picked = new Map<string, VoteRec>()
  for (const v of votes) {
    const key = `${v.memberId} ${v.issueId}`
    const prev = picked.get(key)
    const take = round === 'first' ? v.round === 1 : !prev || v.round >= prev.round
    if (take) picked.set(key, v)
  }
  const byMember = new Map<string, { logs: number[]; abstains: number }>()
  for (const v of picked.values()) {
    const m = byMember.get(v.memberId) ?? { logs: [], abstains: 0 }
    byMember.set(v.memberId, m)
    const value = cardValue(v.card)
    if (value === null) {
      m.abstains += 1
      continue
    }
    const r = ref.get(v.issueId)
    if (r === undefined || !(r > 0)) continue
    m.logs.push(Math.log(value / r))
  }
  return [...byMember.entries()]
    .map(([memberId, { logs, abstains }]) => {
      const n = logs.length
      const band = medianBand(logs)
      const factor = Math.exp(median(logs))
      const lo = Math.exp(band.lo)
      const hi = Math.exp(band.hi)
      return { memberId, factor, lo, hi, n, abstains, verdict: verdictOf({ factor, lo, hi, n }, minN) }
    })
    .sort((a, b) => a.memberId.localeCompare(b.memberId))
}

// The verdict is data; the UI puts words on it in the viewer's language.
export function verdictOf(b: { factor: number; lo: number; hi: number; n: number }, minN = MIN_N): Verdict {
  if (b.n < minN) return { kind: 'few', n: b.n }
  if (b.lo <= 1 && 1 <= b.hi) return { kind: 'calibrated', pct: Math.round((b.hi / b.factor - 1) * 100) }
  if (b.factor < 1) return { kind: 'under', times: Number((1 / b.factor).toFixed(1)) }
  return { kind: 'over', times: Number(b.factor.toFixed(1)) }
}
