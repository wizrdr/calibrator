import { generateSynthetic, type SynthParams } from './synthetic'
import { hoursPerSp, impliedSp, personBias } from './calibration'

const base: SynthParams = {
  sprints: 6,
  issuesPerSprint: 12,
  k: 4,
  sigmaIssue: 0.3,
  people: [
    { name: 'ann', bias: 0.5, sigma: 0.25 },
    { name: 'bob', bias: 1, sigma: 0.25 },
    { name: 'cid', bias: 1.5, sigma: 0.25 },
  ],
  seed: 1,
}

function recover(p: SynthParams, fixedK?: number) {
  const { issues, votes } = generateSynthetic(p)
  const k = fixedK ?? hoursPerSp(issues).k
  const ref = new Map(issues.filter((i) => i.hours !== null).map((i) => [i.issueId, impliedSp(i.hours as number, k)]))
  return Object.fromEntries(personBias(votes, ref).map((b) => [b.memberId, b]))
}

describe('generateSynthetic', () => {
  it('is deterministic for a seed and produces the requested shape', () => {
    const a = generateSynthetic(base)
    const b = generateSynthetic(base)
    expect(a).toEqual(b)
    expect(a.issues).toHaveLength(72)
    expect(a.votes).toHaveLength(72 * 3)
    expect(new Set(a.votes.map((v) => v.memberId))).toEqual(new Set(['ann', 'bob', 'cid']))
    expect(a.sessions).toHaveLength(6)
    expect(a.finalSp.size).toBe(72)
  })

  // A 0.5x perception is not observable on a Fibonacci deck: 3 → 2, 8 → 5, 13 → 8.
  // The observable bias is the large-sample limit of the same noisy process.
  const target = recover({ ...base, issuesPerSprint: 300, seed: 999 })

  it('estimates the team scale k within 15%', () => {
    const { issues } = generateSynthetic(base)
    expect(Math.abs(Math.log(hoursPerSp(issues).k / base.k))).toBeLessThan(0.15)
  })

  it('the observable bias of a 0.5x person sits between 0.5 and the deck floor', () => {
    expect(target.ann.factor).toBeGreaterThan(0.5)
    expect(target.ann.factor).toBeLessThan(0.7)
    expect(Math.abs(Math.log(target.bob.factor))).toBeLessThan(0.03)
    expect(target.cid.factor).toBeGreaterThan(1.3)
  })

  it('recovers the observable bias from noisy data and separates the three people', () => {
    const { ann, bob, cid } = recover(base)
    expect(Math.abs(Math.log(ann.factor / target.ann.factor))).toBeLessThan(0.12)
    expect(ann.label).toMatch(/^занижает в/)
    expect(bob.label).toMatch(/^калиброван/)
    expect(cid.label).toMatch(/^завышает в/)
    expect(ann.hi).toBeLessThan(1)
    expect(cid.lo).toBeGreaterThan(1)
  })

  it('covers the observable bias with its band in at least 18 of 20 seeds (team scale held fixed)', () => {
    let covered = 0
    const factors: number[] = []
    for (let seed = 1; seed <= 20; seed++) {
      const { ann } = recover({ ...base, seed }, base.k)
      factors.push(ann.factor)
      if (ann.lo <= target.ann.factor && target.ann.factor <= ann.hi) covered += 1
    }
    expect(covered).toBeGreaterThanOrEqual(18)
    const mid = [...factors].sort((a, b) => a - b)[10]
    expect(Math.abs(Math.log(mid / target.ann.factor))).toBeLessThan(0.06)
  })

  it('applies missing-fact, abstain and carry-over rates', () => {
    const out = generateSynthetic({ ...base, missingFactRate: 0.5, abstainRate: 0.2, carryOverRate: 0.25, seed: 7 })
    const missing = out.issues.filter((i) => i.hours === null).length
    expect(missing).toBeGreaterThan(20)
    expect(missing).toBeLessThan(52)
    const abstains = out.votes.filter((v) => v.card === '?' || v.card === 'coffee').length
    expect(abstains).toBeGreaterThan(20)
    expect(out.issues.filter((i) => i.sprints.length > 1).length).toBeGreaterThan(8)
  })
})
