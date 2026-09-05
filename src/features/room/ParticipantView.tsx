import { useState } from 'react'
import { castVote, type Participant, type Room } from '@/data/queries'
import { FIB, type Card as CardT } from '@/domain/scale'
import { LangSwitch, useT } from '@/i18n'
import { Button, Card, ErrorText, cn } from '@/ui'
import { useCardLabel } from './cardLabel'
import { currentIssue, seats } from './roomView'

export function ParticipantView({ room, me, reload }: { room: Room; me: Participant; reload: () => Promise<void> }) {
  const { t } = useT()
  const label = useCardLabel()
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
      <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
        <span className="truncate">{session.sprint_name}</span>
        <span className="flex items-center gap-3">
          <span>{me.display_name}</span>
          <LangSwitch className="flex gap-0.5" />
        </span>
      </div>
      <ErrorText error={error} />

      {!cur ? (
        <Card>
          <p className="text-[15px] text-muted">{session.state === 'done' ? t('participant.finished') : t('participant.waiting')}</p>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-2">
            <span className="text-[13px] text-muted">
              {cur.key} · {t('common.round', { n: session.round })}
            </span>
            <h1 className="text-lg font-semibold leading-snug">{cur.summary || cur.key}</h1>
            {!revealed && others.some((s) => s.voted) && (
              <p className="text-[13px] font-medium text-accent-strong">
                {t('participant.alreadyVoted', { names: others.filter((s) => s.voted).map((s) => s.name).join(', ') })}
              </p>
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
                {mine?.card ? t('participant.yourVote', { card: label(mine.card) }) : t('participant.pickCard')}
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
                <p className="mt-3 text-[15px] text-accent-strong">{t('participant.teamFinal', { n: cur.final_sp })}</p>
              ) : (
                <p className="mt-3 text-[13px] text-muted">{t('participant.choosingFinal')}</p>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
