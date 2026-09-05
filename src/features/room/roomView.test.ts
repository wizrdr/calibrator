import { seats, nextIssue } from './roomView'
import type { Room } from '@/data/queries'

const room = {
  session: { id: 's', team_id: 't', sprint_name: 'S', join_code: 'X', state: 'voting', current_issue_id: 'i1', round: 2, created_at: '' },
  issues: [
    { id: 'i1', key: 'A-1', final_sp: null, order_idx: 0 },
    { id: 'i2', key: 'A-2', final_sp: 3, order_idx: 1 },
    { id: 'i3', key: 'A-3', final_sp: null, order_idx: 2 },
  ],
  participants: [
    { id: 'p1', display_name: 'Ann' },
    { id: 'p2', display_name: 'Bob' },
  ],
  votes: [
    { issue_id: 'i1', participant_id: 'p1', round: 2, card: '5' },
    { issue_id: 'i1', participant_id: 'p2', round: 1, card: '3' },
  ],
  votedIds: ['p1'],
} as unknown as Room

describe('roomView', () => {
  it('shows a seat per participant for the current issue and round only', () => {
    expect(seats(room)).toEqual([
      { participantId: 'p1', name: 'Ann', voted: true, card: '5' },
      { participantId: 'p2', name: 'Bob', voted: false, card: null },
    ])
  })

  it('marks a seat as voted from the ids-only signal even when the card is hidden', () => {
    const hidden = { ...room, votes: [], votedIds: ['p2'] } as unknown as Room
    expect(seats(hidden)).toEqual([
      { participantId: 'p1', name: 'Ann', voted: false, card: null },
      { participantId: 'p2', name: 'Bob', voted: true, card: null },
    ])
  })

  it('picks the next issue without a final estimate, skipping the current one', () => {
    expect(nextIssue(room)?.id).toBe('i3')
  })
})
