import { useState } from 'react'
import { castVote, type Participant, type Room } from '@/data/queries'
import { FIB, type Card as CardT } from '@/domain/scale'
import { Button, Card, ErrorText, cn } from '@/ui'
import { currentIssue, seats } from './roomView'

const label = (c: CardT | null) => (c === null ? '—' : c === 'coffee' ? 'перерыв' : c)

export function ParticipantView({ room, me, reload }: { room: Room; me: Participant; reload: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const { session } = room
  const cur = currentIssue(room)
  const all = seats(room)
  const mine = all.find((s) => s.participantId === me.id)
  const others = all.filter((s) => s.participantId !== me.id)
  const revealed = session.state === 'revealed' || session.state === 'done'

  async function vote(card: CardT) {
    if (!cur) return
    try {
      await castVote({ sessionId: session.id, issueId: cur.id, participantId: me.id, round: session.round, card })
      await reload()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const deck = (c: CardT, wide = false) => (
    <Button
      key={c}
      variant={mine?.card === c ? 'primary' : 'secondary'}
      className={cn('h-14 rounded-md text-lg font-semibold', wide && 'text-[15px] font-medium')}
      onClick={() => vote(c)}
      aria-pressed={mine?.card === c}
    >
      {label(c)}
    </Button>
  )

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-4 py-5">
      <div className="flex items-baseline justify-between text-[13px] text-muted">
        <span>{session.sprint_name}</span>
        <span>{me.display_name}</span>
      </div>
      <ErrorText error={error} />

      {!cur ? (
        <Card>
          <p className="text-[15px] text-muted">
            {session.state === 'done' ? 'Планирование закончено. Спасибо!' : 'Ждём, пока фасилитатор откроет задачу.'}
          </p>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-2">
            <span className="text-[13px] text-muted">
              {cur.key} · раунд {session.round}
            </span>
            <h1 className="text-lg font-semibold leading-snug">{cur.summary || cur.key}</h1>
            {!revealed && others.some((s) => s.voted) && (
              <p className="text-[13px] font-medium text-accent-strong">Уже сдали: {others.filter((s) => s.voted).map((s) => s.name).join(', ')}</p>
            )}
          </Card>

          {session.state === 'voting' && (
            <div className="flex flex-col gap-2" data-testid="deck">
              <div className="grid grid-cols-3 gap-2">{FIB.map((n) => deck(String(n) as CardT))}</div>
              <div className="grid grid-cols-2 gap-2">
                {deck('?', true)}
                {deck('coffee', true)}
              </div>
              <p className="text-center text-[13px] text-muted">
                {mine?.card ? `Ваш голос: ${label(mine.card)}. Можно поменять до вскрытия.` : 'Выберите карту. Никто не видит её до вскрытия.'}
              </p>
            </div>
          )}

          {revealed && (
            <Card>
              <ul className="flex flex-col gap-1.5 text-[15px]" data-testid="revealed">
                {all.map((s) => (
                  <li key={s.participantId} className="flex justify-between">
                    <span className={cn(s.participantId === me.id && 'font-medium')}>{s.name}</span>
                    <span className="font-semibold tabular-nums">{label(s.card)}</span>
                  </li>
                ))}
              </ul>
              {cur.final_sp !== null ? (
                <p className="mt-3 text-[15px] text-accent-strong">Итог команды: {cur.final_sp}</p>
              ) : (
                <p className="mt-3 text-[13px] text-muted">Фасилитатор выбирает итог.</p>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
