import { useState } from 'react'
import { Link } from 'react-router-dom'
import { finishSession, reveal, setFinal, startVoting, type Room } from '@/data/queries'
import { FIB, snapToFib, type Card as CardT } from '@/domain/scale'
import { median } from '@/domain/stats'
import { Button, Card, ErrorText, PageHeader, Pill, cn } from '@/ui'
import { JoinCode } from './JoinCode'
import { currentIssue, nextIssue, seats } from './roomView'

const cardLabel = (c: CardT | null) => (c === null ? '—' : c === 'coffee' ? 'перерыв' : c === '?' ? '?' : c)

export function FacilitatorView({ room, reload }: { room: Room; reload: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const { session, issues, participants } = room
  const cur = currentIssue(room)
  const next = nextIssue(room)
  const decided = issues.filter((i) => i.final_sp !== null)
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
        subtitle={`${participants.length} участников · ${decided.length} оценено, ${left} осталось`}
        actions={<JoinCode code={session.join_code} compact={participants.length > 0 && session.state !== 'lobby'} />}
      />
      <ErrorText error={error} />

      {decided.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-[13px] text-muted hover:text-text">
            Уже оценили: {decided.map((i) => `${i.key} → ${i.final_sp}`).join(' · ')}
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
                    Переоценить
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
              {cur.key} · {revealed ? 'вскрыто' : 'сейчас'} · раунд {session.round}
            </span>
            {!revealed && (
              <span className="font-semibold text-accent-strong" data-testid="voted-count">
                {voted} из {participants.length} проголосовали
              </span>
            )}
          </div>
          <h2 className="text-xl font-semibold leading-snug">{cur.summary || cur.key}</h2>

          {participants.length === 0 ? (
            <p className="text-[15px] text-muted">Пока никто не вошёл. Отправьте команде ссылку или покажите QR.</p>
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
                  <span className="text-[12px] text-muted">похоже на</span>
                  <span className="text-2xl font-bold text-accent-strong">{suggested}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2" data-testid="seats">
              {current.map((s) => (
                <Pill key={s.participantId} tone={s.voted ? 'done' : 'pending'} data-testid="seat">
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
              <p className="font-semibold">Все задачи оценены</p>
              <p className="max-w-[60ch] text-[15px] text-muted">
                Когда спринт закроется в Jira, загрузите CSV с Time Spent: тогда в калибровке появится, кто и насколько промахнулся.
              </p>
              <Link to="/import">
                <Button>Загрузить факт из Jira</Button>
              </Link>
            </>
          ) : (
            <>
              <p className="max-w-[60ch] text-[15px] text-muted">
                {participants.length === 0 ? 'Дождитесь, пока команда войдёт по ссылке, и начните с первой задачи.' : 'Команда на месте. Начинаем?'}
              </p>
              {next && <Button size="lg" onClick={run(() => startVoting(session.id, next.id))}>Начать: {next.key}</Button>}
            </>
          )}
        </Card>
      )}

      {cur && (
        <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-2 border-t border-border bg-surface px-5 py-3 md:-mx-10 md:px-10">
          {session.state === 'voting' && (
            <>
              <Button size="lg" onClick={run(() => reveal(session.id))} disabled={voted === 0}>
                Вскрыть карты
              </Button>
              {next && (
                <Button variant="secondary" onClick={run(() => startVoting(session.id, next.id))}>
                  Отложить, дальше {next.key}
                </Button>
              )}
            </>
          )}
          {revealed && (
            <>
              <span className="text-[13px] text-muted">Итог команды:</span>
              {FIB.map((sp) => (
                <Button
                  key={sp}
                  variant={cur.final_sp === sp || (cur.final_sp === null && suggested === sp) ? 'primary' : 'secondary'}
                  className="min-w-12 px-3"
                  aria-label={`Итог ${sp}`}
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
                Переголосовать
              </Button>
            </>
          )}
          <span className="ml-auto text-[13px] text-muted">
            {left > 0 ? `Осталось ${left} задач` : 'Последняя задача'}
          </span>
        </div>
      )}

      {issues.filter((i) => i.final_sp === null && i.id !== cur?.id).length > 0 && (
        <details>
          <summary className="cursor-pointer list-none text-[13px] text-muted hover:text-text">
            Ещё не оценены: {issues.filter((i) => i.final_sp === null && i.id !== cur?.id).length}
          </summary>
          <ul className="mt-3 flex flex-col gap-1">
            {issues
              .filter((i) => i.final_sp === null && i.id !== cur?.id)
              .map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={run(() => startVoting(session.id, i.id))}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[15px] hover:bg-surface"
                  >
                    <span className="truncate">
                      <span className="text-muted">{i.key}</span> {i.summary}
                    </span>
                    <span className="text-[13px] text-muted">оценить</span>
                  </button>
                </li>
              ))}
          </ul>
        </details>
      )}
    </div>
  )
}
