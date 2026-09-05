import { useState } from 'react'
import { Link } from 'react-router-dom'
import { finishSession, reveal, setFinal, startVoting, type Room } from '@/data/queries'
import { FIB, snapToFib } from '@/domain/scale'
import { median } from '@/domain/stats'
import { useT } from '@/i18n'
import { Button, Card, ErrorText, PageHeader, Pill, cn } from '@/ui'
import { JoinCode } from './JoinCode'
import { useCardLabel } from './cardLabel'
import { currentIssue, nextIssue, seats } from './roomView'

export function FacilitatorView({ room, reload }: { room: Room; reload: () => Promise<void> }) {
  const { t } = useT()
  const cardLabel = useCardLabel()
  const [error, setError] = useState<string | null>(null)
  const { session, issues, participants } = room
  const cur = currentIssue(room)
  const next = nextIssue(room)
  const decided = issues.filter((i) => i.final_sp !== null)
  const pending = issues.filter((i) => i.final_sp === null && i.id !== cur?.id)
  const left = issues.filter((i) => i.final_sp === null).length
  const revealed = session.state === 'revealed'
  const current = seats(room)
  const voted = current.filter((s) => s.voted).length

  const run = (fn: () => Promise<void>) => async () => {
    try {
      await fn()
      await reload()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const numericVotes = current.map((s) => Number(s.card)).filter((n) => Number.isFinite(n) && n > 0)
  const suggested = numericVotes.length > 0 ? snapToFib(median(numericVotes)) : null

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={session.sprint_name}
        subtitle={`${t('room.participants', { n: participants.length })} · ${t('room.progress', { done: decided.length, left })}`}
        actions={<JoinCode code={session.join_code} compact={participants.length > 0 && session.state !== 'lobby'} />}
      />
      <ErrorText error={error} />

      {decided.length > 0 && (
        <details>
          <summary className="cursor-pointer list-none text-[13px] text-muted hover:text-text">
            {t('room.decided', { list: decided.map((i) => `${i.key} → ${i.final_sp}`).join(' · ') })}
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {decided.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-md bg-surface px-4 py-2.5 text-[15px]">
                <span className="truncate">
                  <span className="text-muted">{i.key}</span> {i.summary}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold text-accent-strong">{i.final_sp}</span>
                  <Button variant="ghost" size="sm" onClick={run(() => startVoting(session.id, i.id))}>
                    {t('room.reestimate')}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {cur ? (
        <Card tone="active" className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-[13px] text-muted">
            <span>
              {cur.key} · {revealed ? t('room.revealed') : t('room.now')} · {t('common.round', { n: session.round })}
            </span>
            {!revealed && (
              <span className="font-semibold text-accent-strong" data-testid="voted-count">
                {t('room.votedCount', { voted, total: participants.length })}
              </span>
            )}
          </div>
          <h2 className="text-xl font-semibold leading-snug">{cur.summary || cur.key}</h2>

          {participants.length === 0 ? (
            <p className="text-[15px] text-muted">{t('room.nobodyYet')}</p>
          ) : revealed ? (
            <div className="flex flex-wrap items-end gap-3" data-testid="seats">
              {current.map((s) => (
                <div key={s.participantId} className="flex flex-col items-center gap-1" data-testid="seat" data-voted={s.voted}>
                  <div
                    className={cn(
                      'flex h-16 w-12 items-center justify-center rounded-sm text-lg font-semibold',
                      s.card ? 'bg-surface-raised' : 'border border-dashed border-border-strong text-faint',
                    )}
                    data-testid="seat-card"
                  >
                    {cardLabel(s.card)}
                  </div>
                  <span className="text-[12px] text-muted">{s.name}</span>
                </div>
              ))}
              {suggested !== null && (
                <div className="ml-auto flex flex-col items-end">
                  <span className="text-[12px] text-muted">{t('room.looksLike')}</span>
                  <span className="text-2xl font-bold text-accent-strong">{suggested}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2" data-testid="seats">
              {current.map((s) => (
                <Pill key={s.participantId} tone={s.voted ? 'done' : 'pending'}>
                  <span data-testid="seat" data-voted={s.voted}>
                    {s.name}
                  </span>
                </Pill>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card className="flex flex-col items-start gap-3">
          {session.state === 'done' ? (
            <>
              <p className="font-semibold">{t('room.allDone')}</p>
              <p className="max-w-[60ch] text-[15px] text-muted">{t('room.allDoneBody')}</p>
              <Link to="/import">
                <Button>{t('room.loadFacts')}</Button>
              </Link>
            </>
          ) : (
            <>
              <p className="max-w-[60ch] text-[15px] text-muted">{participants.length === 0 ? t('room.waitTeam') : t('room.teamReady')}</p>
              {next && (
                <Button size="lg" onClick={run(() => startVoting(session.id, next.id))}>
                  {t('room.start', { key: next.key })}
                </Button>
              )}
            </>
          )}
        </Card>
      )}

      {cur && (
        <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-2 border-t border-border bg-surface px-5 py-3 md:-mx-10 md:px-10">
          {session.state === 'voting' && (
            <>
              <Button size="lg" onClick={run(() => reveal(session.id))} disabled={voted === 0}>
                {t('room.reveal')}
              </Button>
              {next && (
                <Button variant="secondary" onClick={run(() => startVoting(session.id, next.id))}>
                  {t('room.skip', { key: next.key })}
                </Button>
              )}
            </>
          )}
          {revealed && (
            <>
              <span className="text-[13px] text-muted">{t('room.finalLabel')}</span>
              {FIB.map((sp) => (
                <Button
                  key={sp}
                  variant={cur.final_sp === sp || (cur.final_sp === null && suggested === sp) ? 'primary' : 'secondary'}
                  className="min-w-12 px-3"
                  aria-label={t('room.finalAria', { n: sp })}
                  onClick={run(async () => {
                    await setFinal(cur.id, sp)
                    if (next) await startVoting(session.id, next.id)
                    else await finishSession(session.id)
                  })}
                >
                  {sp}
                </Button>
              ))}
              <Button variant="ghost" onClick={run(() => startVoting(session.id, cur.id, session.round + 1))}>
                {t('room.revote')}
              </Button>
            </>
          )}
          <span className="ml-auto text-[13px] text-muted">{left > 0 ? t('room.left', { n: left }) : t('room.last')}</span>
        </div>
      )}

      {pending.length > 0 && (
        <details>
          <summary className="cursor-pointer list-none text-[13px] text-muted hover:text-text">{t('room.notEstimated', { n: pending.length })}</summary>
          <ul className="mt-3 flex flex-col gap-1">
            {pending.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={run(() => startVoting(session.id, i.id))}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[15px] hover:bg-surface"
                >
                  <span className="truncate">
                    <span className="text-muted">{i.key}</span> {i.summary}
                  </span>
                  <span className="text-[13px] text-muted">{t('room.estimate')}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
