import type { SynthParams } from './synthetic'

export const DEMO_PARAMS: SynthParams = {
  sprints: 6,
  issuesPerSprint: 12,
  k: 4,
  sigmaIssue: 0.3,
  people: [
    { name: 'Ann', bias: 0.5, sigma: 0.25 },
    { name: 'Bob', bias: 1, sigma: 0.25 },
    { name: 'Cid', bias: 1.5, sigma: 0.25 },
  ],
  missingFactRate: 0.15,
  carryOverRate: 0.1,
  seed: 1,
}
