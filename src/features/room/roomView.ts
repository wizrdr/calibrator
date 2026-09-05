import type { Card } from '@/domain/scale'
import type { Room } from '@/data/queries'

export type Seat = { participantId: string; name: string; voted: boolean; card: Card | null }

// What a viewer sees for the current issue and round. Hidden cards are simply absent from
// the votes the server returned, so `voted` without `card` means "voted, not revealed to me".
export function seats(room: Room): Seat[] {
  const { session, votes, participants } = room
  const current = votes.filter((v) => v.issue_id === session.current_issue_id && v.round === session.round)
  return participants.map((p) => {
    const v = current.find((x) => x.participant_id === p.id)
    return { participantId: p.id, name: p.display_name, voted: !!v, card: (v?.card as Card | undefined) ?? null }
  })
}

export function currentIssue(room: Room) {
  return room.issues.find((i) => i.id === room.session.current_issue_id) ?? null
}

export function nextIssue(room: Room) {
  const cur = currentIssue(room)
  const pending = room.issues.filter((i) => i.final_sp === null && i.id !== cur?.id)
  return pending[0] ?? null
}
