import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMembers, listTeamParticipants, listTeamVotes, setExcludeReason } from '@/data/queries'
import { buildReport, type Report } from '@/domain/report'
import { seedDemo } from '@/features/demo/seedDemo'
import { useTeam } from '@/features/team/useTeam'
import { Button, Card, Empty, ErrorText, PageHeader, Stat, cn } from '@/ui'
import { BiasTable } from './BiasTable'
import { CurveChart } from './CurveChart'

type Raw = Parameters<typeof buildReport>[0]

export function ReportPage() {
  const { team, issues, sessions, refresh } = useTeam()
  const [raw, setRaw] = useState<Raw | null>(null)
  const [round, setRound] = useState<'first' | 'last'>('first')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!team) return
    try {
      const [votes, participants, members] = await Promise.all([listTeamVotes(team.id), listTeamParticipants(team.id), listMembers(team.id)])
      setRaw({ issues, votes, participants, members, sessions })
    } catch (e) {
      setError((e as Error).message)
    }
  }, [team, issues, sessions])

  useEffect(() => {
    load()
  }, [load])

  async function demo() {
    if (!team) return
    setBusy(true)
    try {
      await seedDemo(team.id)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function exclude(key: string) {
    const issue = issues.find((i) => i.key === key)
    if (!issue) return
    await setExcludeReason(issue.id, 'no fact')
    await refresh()
  }

  if (error) return <ErrorText error={error} />
  if (!raw) return <p className="text-sm text-muted">Загрузка…</p>
  const r: Report = buildReport(raw, { round })

  if (r.estimated === 0) {
    return (
      <>
        <PageHeader title="Калибровка команды" />
        <Empty
          title="Пока нечего калибровать"
          action={
            <div className="flex flex-wrap gap-2">
              <Link to="/new">
                <Button>Новое планирование</Button>
              </Link>
              <Button variant="secondary" onClick={demo} disabled={busy} data-testid="demo">
                {busy ? 'Создаём пример…' : 'Посмотреть на примере'}
              </Button>
            </div>
          }
        >
          Здесь появится, сколько часов у вашей команды занимает один story point и кто системно занижает или завышает оценки. Нужно
          хотя бы одно планирование и факт из Jira. Пример покажет всё на выдуманной команде из трёх человек.
        </Empty>
      </>
    )
  }

  const k = r.scale.k
  return (
    <>
      <PageHeader
        title="Калибровка команды"
        subtitle={
          r.withFact === 0
            ? 'Голоса есть, факта из Jira ещё нет: пока видно только, кто спорит с командой.'
            : `По ${r.withFact} задачам с фактом из ${r.estimated} оценённых.`
        }
        actions={
          r.withFact < r.estimated && (
            <Link to="/import">
              <Button variant="secondary">Загрузить факт из Jira</Button>
            </Link>
          )
        }
      />

      {r.withFact > 0 && (
        <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Один story point у вас" value={Number.isFinite(k) ? `≈ ${k.toFixed(1)} ч` : '—'} sub={r.scale.thin ? 'мало данных, оценка грубая' : `по ${r.scale.n} задачам`} />
          <Stat label="Факт есть у" value={`${r.withFact} из ${r.estimated}`} sub={`покрытие ${Math.round(r.coverage * 100)}%`} testId="coverage" />
          <Stat label="Переехали в другой спринт" value={String(r.carryOver.count)} sub={`${Math.round(r.carryOver.hoursShare * 100)}% всех часов`} />
          <Stat label="Планирований" value={String(sessions.length)} />
        </Card>
      )}

      {r.withFact > 0 && (
        <Card>
          <h2 className="font-semibold">Сколько часов занимает задача на N story points</h2>
          <p className="mb-3 text-[13px] text-muted">Столбик — медиана часов, усы — половина задач вокруг неё. Серые: меньше трёх задач, не доверяйте.</p>
          <CurveChart curve={r.curve} k={k} />
        </Card>
      )}

      {r.withFact > 0 && (
        <Card>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold">Кто как голосует относительно факта</h2>
              <p className="max-w-[64ch] text-[13px] text-muted">
                Часы задачи переводим в story points по кривой команды и сравниваем с голосом человека. «Занижает в 1.8×» значит: его карта в
                медиане в 1.8 раза меньше того, во что задача обошлась. Всё относительно команды, а не абсолютной шкалы.
              </p>
            </div>
            <div className="flex rounded-md bg-surface-raised p-0.5 text-[13px]">
              {(['first', 'last'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRound(v)}
                  className={cn('rounded-sm px-3 py-1.5', round === v ? 'bg-surface font-medium shadow-sm' : 'text-muted')}
                >
                  {v === 'first' ? 'первый раунд' : 'последний раунд'}
                </button>
              ))}
            </div>
          </div>
          <BiasTable rows={r.biasVsFact} names={r.names} testId="bias-fact" />
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">Кто как голосует относительно итога команды</h2>
        <p className="mb-3 max-w-[64ch] text-[13px] text-muted">Не требует Jira: сравниваем карту человека с тем, на чём команда сошлась. Показывает, кто спорит и в какую сторону.</p>
        <BiasTable rows={r.biasVsFinal} names={r.names} testId="bias-final" />
      </Card>

      {r.withFact > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-semibold">Самые большие промахи</h2>
            <ul className="flex flex-col gap-2 text-[15px]">
              {r.topMisses.map((m) => (
                <li key={m.key} className="flex justify-between gap-3">
                  <span className="truncate">
                    <span className="text-muted">{m.key}</span> {m.summary}
                  </span>
                  <span className="whitespace-nowrap tabular-nums text-muted">
                    {m.finalSp} SP → {m.hours.toFixed(0)} ч ≈ {m.impliedSp.toFixed(1)} SP
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-1 font-semibold">Оценены, но факта нет</h2>
            <p className="mb-3 text-[13px] text-muted">Не закрыты в Jira или без списанных часов. Разбитые на подзадачи лучше исключить.</p>
            {r.drift.length > 0 && (
              <ul className="mb-3 flex flex-col gap-1 text-[15px]">
                {r.drift.map((d) => (
                  <li key={d.key} className="flex justify-between">
                    <span className="text-muted">{d.key} переоценена</span>
                    <span className="tabular-nums">
                      {d.first} → {d.last}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {r.unresolvedWithEstimate.length === 0 ? (
              <p className="text-[15px] text-muted">У всех оценённых задач есть факт.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-[15px]">
                {r.unresolvedWithEstimate.map((key) => (
                  <li key={key} className="flex items-center justify-between">
                    <span className="font-mono">{key}</span>
                    <Button variant="ghost" size="sm" onClick={() => exclude(key)}>
                      исключить
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
