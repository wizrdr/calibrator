import { useCallback, useEffect, useState } from 'react'
import { assignMember, listTeamParticipants, type Member, type Participant } from '@/data/queries'
import { Card, ErrorText } from '@/ui'

// Participants join by typing a name; here the facilitator ties each distinct name to a roster member,
// so votes from different sessions accumulate on one person.
export function MappingCard({ teamId, members }: { teamId: string; members: Member[] }) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    listTeamParticipants(teamId).then(setParticipants).catch((e) => setError((e as Error).message))
  }, [teamId])

  useEffect(() => {
    reload()
  }, [reload])

  const groups = new Map<string, Participant[]>()
  for (const p of participants) {
    const g = groups.get(p.display_name) ?? []
    g.push(p)
    groups.set(p.display_name, g)
  }
  if (groups.size === 0) return null

  async function assign(name: string, memberId: string) {
    try {
      const ids = (groups.get(name) ?? []).map((p) => p.id)
      await assignMember(ids, memberId || null)
      reload()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">Участники → ростер</h2>
      <ErrorText error={error} />
      <ul className="flex flex-col gap-2">
        {[...groups.entries()].map(([name, ps]) => {
          const current = ps.find((p) => p.member_id)?.member_id ?? ''
          const suggested = members.find((m) => m.name.toLowerCase() === name.toLowerCase())
          return (
            <li key={name} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {name} <span className="text-muted">· {ps.length} сесс.</span>
              </span>
              <select
                value={current}
                onChange={(e) => assign(name, e.target.value)}
                className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
                aria-label={`Участник ${name}`}
              >
                <option value="">{suggested ? `не привязан (похоже на ${suggested.name})` : 'не привязан'}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
