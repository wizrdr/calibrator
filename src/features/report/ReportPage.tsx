import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  listMembers,
  listTeamIssues,
  listTeamParticipants,
  listTeamSessions,
  listTeamVotes,
  setExcludeReason,
} from '@/data/queries'
import { buildReport, type Report } from '@/domain/report'
import { Button, Card, ErrorText, cn } from '@/ui'
import { BiasTable } from './BiasTable'
import { CurveChart } from './CurveChart'

type Raw = Parameters<typeof buildReport>[0]

export function ReportPage() {
  const { teamId = '' } = useParams()
  const [raw, setRaw] = useState<Raw | null>(null)
  const [round, setRound] = useState<'first' | 'last'>('first')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [issues, votes, participants, members, sessions] = await Promise.all([
        listTeamIssues(teamId),
        listTeamVotes(teamId),
        listTeamParticipants(teamId),
        listMembers(teamId),
        listTeamSessions(teamId),
      ])
      setRaw({ issues, votes, participants, members, sessions })
    } catch (e) {
      setError((e as Error).message)
    }
  }, [teamId])

  useEffect(() => {
    load()
  }, [load])

  if (error) return <ErrorText error={error} />
  if (!raw) return <p className="text-sm text-muted">Загрузка…</p>
  const r: Report = buildReport(raw, { round })
  const issueByKey = new Map(raw.issues.map((i) => [i.key, i]))

  async function exclude(key: string) {
    const issue = issueByKey.get(key)
    if (!issue) return
    await setExcludeReason(issue.id, 'no fact')
    await load()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Отчёт</h1>
        <nav className="flex gap-4 text-sm">
          <Link to={`/team/${teamId}/import`} className="text-accent hover:underline">
            Импорт факта
          </Link>
          <Link to={`/team/${teamId}`} className="text-muted hover:text-text">
            ← команда
          </Link>
        </nav>
      </div>

      <Card>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Оценено" value={String(r.estimated)} />
          <Stat label="С фактом" value={String(r.withFact)} sub={`coverage ${Math.round(r.coverage * 100)}%`} testId="coverage" />
          <Stat
            label="1 SP ≈"
            value={Number.isFinite(r.scale.k) ? `${r.scale.k.toFixed(1)} ч` : '—'}
            sub={r.scale.thin ? 'оценка ненадёжна' : `по ${r.scale.n} задачам`}
          />
          <Stat label="Перенос" value={String(r.carryOver.count)} sub={`${Math.round(r.carryOver.hoursShare * 100)}% часов`} />
        </dl>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">Кривая команды</h2>
        <p className="mb-3 text-xs text-muted">Медиана часов по story points, усы = межквартильный размах. Серые столбики: меньше 3 задач.</p>
        <CurveChart curve={r.curve} k={r.scale.k} />
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Смещение относительно факта</h2>
            <p className="text-xs text-muted">Во сколько раз голос отличается от часов, переведённых в SP по кривой команды. Относительно команды, не абсолютно.</p>
          </div>
          <div className="flex rounded-md border border-border text-xs">
            {(['first', 'last'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRound(v)}
                className={cn('px-3 py-1', round === v ? 'bg-surface-raised font-medium' : 'text-muted')}
              >
                {v === 'first' ? 'первый раунд' : 'последний раунд'}
              </button>
            ))}
          </div>
        </div>
        <BiasTable rows={r.biasVsFact} names={r.names} testId="bias-fact" />
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">Смещение относительно итога команды</h2>
        <p className="mb-3 text-xs text-muted">Доступно сразу после сессии, без Jira: кто спорит с командой и в какую сторону.</p>
        <BiasTable rows={r.biasVsFinal} names={r.names} testId="bias-final" />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Топ промахов</h2>
          {r.topMisses.length === 0 ? (
            <p className="text-sm text-muted">Нет задач с фактом.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {r.topMisses.map((m) => (
                <li key={m.key} className="flex justify-between gap-3">
                  <span className="truncate">
                    <span className="font-mono text-muted">{m.key}</span> {m.summary}
                  </span>
                  <span className="whitespace-nowrap tabular-nums text-muted">
                    {m.finalSp} SP → {m.hours.toFixed(0)} ч ≈ {m.impliedSp.toFixed(1)} SP
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Дрифт оценок и без факта</h2>
          {r.drift.length > 0 && (
            <ul className="mb-3 flex flex-col gap-1 text-sm">
              {r.drift.map((d) => (
                <li key={d.key} className="flex justify-between">
                  <span className="font-mono text-muted">{d.key}</span>
                  <span className="tabular-nums">
                    {d.first} → {d.last}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {r.unresolvedWithEstimate.length === 0 ? (
            <p className="text-sm text-muted">У всех оценённых задач есть факт.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {r.unresolvedWithEstimate.map((key) => (
                <li key={key} className="flex items-center justify-between">
                  <span className="font-mono">{key}</span>
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => exclude(key)}>
                    исключить
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, testId }: { label: string; value: string; sub?: string; testId?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums" data-testid={testId}>
        {value}
      </dd>
      {sub && <dd className="text-xs text-muted">{sub}</dd>}
    </div>
  )
}
