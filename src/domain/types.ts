import type { Card } from './scale'

export type FactIssue = {
  issueId: string
  key: string
  sp: number
  hours: number | null
  sprints: string[]
  excluded: boolean
}

export type VoteRec = { issueId: string; memberId: string; card: Card; round: number }

export type CurvePoint = { sp: number; n: number; median: number; q1: number; q3: number }

export type Scale = { k: number; n: number; thin: boolean }

export type Bias = {
  memberId: string
  factor: number
  lo: number
  hi: number
  n: number
  abstains: number
  label: string
}
