import { useState } from 'react'
import { Link } from 'react-router-dom'
import { finishSession, reveal, setFinal, startVoting, type Room } from '@/data/queries'
import { FIB } from '@/domain/scale'
import { Button, Card, ErrorText, cn } from '@/ui'
import { currentIssue, nextIssue, seats } from './roomView'

export function FacilitatorView({ room, reload }: { room: Room; reload: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const { session } = room
  const cur = currentIssue(room)
  const next = nextIssue(room)
  const joinUrl = `${location.origin}${import.meta.env.BASE_URL}j/${session.join_code}`

  const run = (fn: () => Promise<void>) => async () => {
    try {
      await fn()
      await reload()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">{session.sprint_name}</h1>
        <Link to={`/team/${session.team_id}`} className="text-sm text-muted hover:text-text">
          ← команда
        </Link>
      </div>
      <ErrorText error={error} />

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">
          Код <span className="font-mono text-lg font-semibold text-text">{session.join_code}</span>
          <span className="mx-2">·</span>
          <code className="font-mono text-xs">{joinUrl}</code>
        </div>
        <div className="text-sm text-muted">
          Участников: {room.participants.length}
          {session.state === 'done' && <span className="ml-2 rounded-full bg-success px-2 py-0.5 text-xs text-on-color">завершена</span>}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Card>
          {cur ? (
            <>
              <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-muted">
                <span>
                  {session.state === 'voting' ? 'Голосование' : session.state === 'revealed' ? 'Вскрыто' : 'Задача'} · раунд {session.round}
                </span>
                <span className="font-mono">{cur.key}</span>
              </div>
              <h2 className="mb-4 text-lg font-semibold">{cur.summary || cur.key}</h2>

              <ul className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="seats">
                {seats(room).map((s) => (
                  <li
                    key={s.participantId}
                    data-testid="seat"
                    className={cn(
                      'flex items-center justify-between rounded-md border px-3 py-2 text-sm',
                      s.voted ? 'border-accent bg-accent-soft' : 'border-border',
                    )}
                  >
                    <span>{s.name}</span>
                    <span className="font-mono font-semibold" data-testid="seat-card">
                      {session.state === 'revealed' || session.state === 'done' ? (s.card === 'coffee' ? '☕' : s.card ?? '—') : s.voted ? '✓' : '…'}
                    </span>
                  </li>
                ))}
                {room.participants.length === 0 && <li className="text-sm text-muted">Пока никого. Отправь код.</li>}
              </ul>

              <div className="flex flex-wrap items-center gap-2">
                {session.state === 'voting' && <Button onClick={run(() => reveal(session.id))}>Вскрыть</Button>}
                {session.state === 'revealed' && (
                  <>
                    <Button variant="secondary" onClick={run(() => startVoting(session.id, cur.id, session.round + 1))}>
                      Переголосовать
                    </Button>
                    <span className="ml-2 text-sm text-muted">Итог:</span>
                    {FIB.map((sp) => (
                      <Button
                        key={sp}
                        variant={cur.final_sp === sp ? 'primary' : 'secondary'}
                        className="min-w-10 px-2"
                        onClick={run(async () => {
                          await setFinal(cur.id, sp)
                          if (next) await startVoting(session.id, next.id)
                          else await finishSession(session.id)
                        })}
                      >
                        {sp}
                      </Button>
                    ))}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted">
                {session.state === 'done' ? 'Все задачи оценены.' : 'Выбери задачу справа или начни с первой.'}
              </p>
              {next && session.state !== 'done' && <Button onClick={run(() => startVoting(session.id, next.id))}>Начать: {next.key}</Button>}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-muted">Задачи</h3>
          <ol className="flex flex-col gap-1">
            {room.issues.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={run(() => startVoting(session.id, i.id))}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-raised',
                    i.id === cur?.id && 'bg-surface-raised font-medium',
                  )}
                >
                  <span className="truncate">
                    <span className="font-mono text-muted">{i.key}</span> {i.summary}
                  </span>
                  <span className="ml-2 font-mono text-muted">{i.final_sp ?? ''}</span>
                </button>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  )
}
