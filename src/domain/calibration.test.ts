import { teamCurve, hoursPerSp, impliedSp, personBias } from './calibration'
import type { FactIssue, VoteRec } from './types'

const issue = (id: string, sp: number, hours: number | null, excluded = false): FactIssue => ({
  issueId: id, key: id, sp, hours, sprints: ['S1'], excluded,
})

const issues: FactIssue[] = [
  issue('a', 1, 2), issue('b', 1, 3), issue('c', 1, 4),
  issue('d', 3, 6), issue('e', 3, 9), issue('f', 3, 12), issue('g', 3, 15),
  issue('h', 8, 20),
  issue('skip-nofact', 5, null),
  issue('skip-excluded', 5, 40, true),
]

describe('teamCurve', () => {
  it('groups hours by story points with median and quartiles', () => {
    expect(teamCurve(issues)).toEqual([
      { sp: 1, n: 3, median: 3, q1: 2.5, q3: 3.5 },
      { sp: 3, n: 4, median: 10.5, q1: 8.25, q3: 12.75 },
      { sp: 8, n: 1, median: 20, q1: 20, q3: 20 },
    ])
  })
})

describe('hoursPerSp', () => {
  it('is the median hours/sp ratio in log space', () => {
    const scale = hoursPerSp(issues)
    expect(scale).toMatchObject({ n: 8, thin: false })
    expect(scale.k).toBeCloseTo(3, 10)
  })

  it('flags thin data below 8 issues or 3 distinct sp values', () => {
    expect(hoursPerSp(issues.slice(0, 7)).thin).toBe(true)
    const twoLevels = issues.filter((i) => i.sp !== 8).concat([issue('x', 1, 3)])
    expect(hoursPerSp(twoLevels)).toMatchObject({ n: 8, thin: true })
  })

  it('returns NaN scale with no facts', () => {
    expect(hoursPerSp([issue('a', 1, null)])).toEqual({ k: NaN, n: 0, thin: true })
  })
})

describe('impliedSp', () => {
  it('divides hours by the team scale', () => {
    expect(impliedSp(6, 3)).toBe(2)
  })
})

describe('personBias', () => {
  const ref = new Map(Object.entries({ i1: 2, i2: 4, i3: 6, i4: 10, i5: 16, i6: 26, i7: 2, i8: 4 }))
  const half: VoteRec[] = (['1', '2', '3', '5', '8', '13', '1', '2'] as const).map((card, n) => ({
    issueId: `i${n + 1}`, memberId: 'ann', card, round: 1,
  }))

  it('recovers a consistent 2x underestimate with a tight band', () => {
    const [ann] = personBias(half, ref)
    expect(ann.memberId).toBe('ann')
    expect(ann.factor).toBeCloseTo(0.5, 6)
    expect(ann.lo).toBeCloseTo(0.5, 6)
    expect(ann.hi).toBeCloseTo(0.5, 6)
    expect(ann.n).toBe(8)
    expect(ann.label).toBe('занижает в 2.0×')
  })

  it('labels a member as calibrated when the band covers 1', () => {
    const exact = new Map(Object.entries({ i1: 1, i2: 2, i3: 3, i4: 5, i5: 8, i6: 13, i7: 1, i8: 2 }))
    const votes: VoteRec[] = (['1', '2', '3', '5', '8', '13', '1', '2'] as const).map((card, n) => ({
      issueId: `i${n + 1}`, memberId: 'bob', card, round: 1,
    }))
    const [bob] = personBias(votes, exact)
    expect(bob.factor).toBe(1)
    expect(bob.label).toBe('калиброван ±0%')
  })

  it('labels overestimates and reports too little data', () => {
    const votes: VoteRec[] = [
      { issueId: 'i1', memberId: 'cid', card: '3', round: 1 },
      { issueId: 'i2', memberId: 'cid', card: '5', round: 1 },
      { issueId: 'i3', memberId: 'cid', card: '8', round: 1 },
    ]
    const [cid] = personBias(votes, ref)
    expect(cid.n).toBe(3)
    expect(cid.factor).toBeCloseTo(4 / 3, 6)
    expect(cid.label).toBe('недостаточно данных (3)')
    expect(personBias(votes, ref, { minN: 3 })[0].label).toBe('завышает в 1.3×')
  })

  it('counts abstains separately and ignores issues without a reference', () => {
    const votes: VoteRec[] = [
      ...half,
      { issueId: 'i9', memberId: 'ann', card: '?', round: 1 },
      { issueId: 'i10', memberId: 'ann', card: 'coffee', round: 1 },
      { issueId: 'unknown', memberId: 'ann', card: '13', round: 1 },
    ]
    const [ann] = personBias(votes, ref)
    expect(ann.n).toBe(8)
    expect(ann.abstains).toBe(2)
  })

  it('uses round 1 by default and the last round on request', () => {
    const votes: VoteRec[] = [
      ...half,
      { issueId: 'i1', memberId: 'ann', card: '2', round: 2 },
      { issueId: 'i2', memberId: 'ann', card: '5', round: 2 },
      { issueId: 'i3', memberId: 'ann', card: '5', round: 2 },
      { issueId: 'i4', memberId: 'ann', card: '8', round: 3 },
    ]
    expect(personBias(votes, ref)[0].factor).toBeCloseTo(0.5, 6)
    const last = personBias(votes, ref, { round: 'last' })[0]
    expect(last.factor).toBeGreaterThan(0.6)
    expect(last.factor).toBeLessThan(0.8)
    expect(last.n).toBe(8)
  })
})
