import { useState } from 'react'
import { castVote, type Participant, type Room } from '@/data/queries'
import { CARDS, type Card } from '@/domain/scale'
import { Button, Card as Panel, ErrorText, cn } from '@/ui'
import { currentIssue, seats } from './roomView'

const label = (c: Card) => (c === 'coffee' ? '☕' : c)

export function ParticipantView({ room, me, reload }: { room: Room; me: Participant; reload: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const { session } = room
  const cur = currentIssue(room)
  const mine = seats(room).find((s) => s.participantId === me.id)
  const revealed = session.state === 'revealed' || session.state === 'done'

  async function vote(card: Card) {
    if (!cur) return
    try {
      await castVote({ sessionId: session.id, issueId: cur.id, participantId: me.id, round: session.round, card })
      await reload()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">{session.sprint_name}</h1>
        <span className="text-sm text-muted">{me.display_name}</span>
      </div>
      <ErrorText error={error} />

      {!cur ? (
        <Panel>
          <p className="text-sm text-muted">{session.state === 'done' ? 'Сессия завершена. Спасибо!' : 'Ждём, пока фасилитатор выберет задачу.'}</p>
        </Panel>
      ) : (
        <>
          <Panel>
            <div className="mb-1 flex justify-between text-xs uppercase tracking-wide text-muted">
              <span>раунд {session.round}</span>
              <span className="font-mono">{cur.key}</span>
            </div>
            <h2 className="text-base font-semibold">{cur.summary || cur.key}</h2>
          </Panel>

          {session.state === 'voting' && (
            <div className="grid grid-cols-4 gap-2" data-testid="deck">
              {CARDS.map((c) => (
                <Button
                  key={c}
                  variant={mine?.card === c ? 'primary' : 'secondary'}
                  className={cn('h-16 text-xl', c === 'coffee' && 'text-2xl')}
                  onClick={() => vote(c)}
                  aria-pressed={mine?.card === c}
                >
                  {label(c)}
                </Button>
              ))}
            </div>
          )}

          {revealed && (
            <Panel>
              <ul className="flex flex-col gap-1 text-sm" data-testid="revealed">
                {seats(room).map((s) => (
                  <li key={s.participantId} className="flex justify-between">
                    <span>{s.name}</span>
                    <span className="font-mono font-semibold">{s.card ? label(s.card) : '—'}</span>
                  </li>
                ))}
              </ul>
              {cur.final_sp !== null && <p className="mt-3 text-sm text-muted">Итог команды: {cur.final_sp}</p>}
            </Panel>
          )}
        </>
      )}
    </div>
  )
}
