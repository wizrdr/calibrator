import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMembers, listTeamParticipants, listTeamVotes, setExcludeReason } from '@/data/queries'
import { buildReport, type Report } from '@/domain/report'
import { seedDemo } from '@/features/demo/seedDemo'
import { useTeam } from '@/features/team/useTeam'
import { useT } from '@/i18n'
import { Button, Card, Empty, ErrorText, PageHeader, Stat, cn } from '@/ui'
import { BiasTable } from './BiasTable'
import { CurveChart } from './CurveChart'

type Raw = Parameters<typeof buildReport>[0]

export function ReportPage() {
  const { t } = useT()
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
  if (!raw) return <p className="text-sm text-muted">{t('common.loading')}</p>
  const r: Report = buildReport(raw, { round })

  if (r.estimated === 0) {
    return (
      <>
        <PageHeader title={t('report.title')} />
        <Empty
          title={t('report.emptyTitle')}
          action={
            <div className="flex flex-wrap gap-2">
              <Link to="/new">
                <Button>{t('home.newPlanning')}</Button>
              </Link>
              <Button variant="secondary" onClick={demo} disabled={busy} data-testid="demo">
                {busy ? t('report.demoBusy') : t('report.demo')}
              </Button>
            </div>
          }
        >
          {t('report.emptyBody')}
        </Empty>
      </>
    )
  }

  const k = r.scale.k
  const pct = (x: number) => Math.round(x * 100)
  return (
    <>
      <PageHeader
        title={t('report.title')}
        subtitle={r.withFact === 0 ? t('report.noFactsYet') : t('report.byIssues', { withFact: r.withFact, estimated: r.estimated })}
        actions={
          r.withFact < r.estimated && (
            <Link to="/import">
              <Button variant="secondary">{t('report.loadFacts')}</Button>
            </Link>
          )
        }
      />

      {r.withFact > 0 && (
        <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label={t('report.spHours')}
            value={Number.isFinite(k) ? `≈ ${k.toFixed(1)} ${t('report.hoursShort')}` : '—'}
            sub={r.scale.thin ? t('report.thin') : t('report.byN', { n: r.scale.n })}
          />
          <Stat label={t('report.factOf')} value={t('report.ofTotal', { a: r.withFact, b: r.estimated })} sub={t('report.coverage', { pct: pct(r.coverage) })} testId="coverage" />
          <Stat label={t('report.carryOver')} value={String(r.carryOver.count)} sub={t('report.hoursShare', { pct: pct(r.carryOver.hoursShare) })} />
          <Stat label={t('report.plannings')} value={String(sessions.length)} />
        </Card>
      )}

      {r.withFact > 0 && (
        <Card>
          <h2 className="font-semibold">{t('report.curveTitle')}</h2>
          <p className="mb-3 text-[13px] text-muted">{t('report.curveBody')}</p>
          <CurveChart curve={r.curve} k={k} />
        </Card>
      )}

      {r.withFact > 0 && (
        <Card>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold">{t('report.biasFactTitle')}</h2>
              <p className="max-w-[64ch] text-[13px] text-muted">{t('report.biasFactBody')}</p>
            </div>
            <div className="flex rounded-md bg-surface-raised p-0.5 text-[13px]">
              {(['first', 'last'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRound(v)}
                  className={cn('rounded-sm px-3 py-1.5', round === v ? 'bg-surface font-medium shadow-sm' : 'text-muted')}
                >
                  {v === 'first' ? t('report.firstRound') : t('report.lastRound')}
                </button>
              ))}
            </div>
          </div>
          <BiasTable rows={r.biasVsFact} names={r.names} testId="bias-fact" />
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">{t('report.biasFinalTitle')}</h2>
        <p className="mb-3 max-w-[64ch] text-[13px] text-muted">{t('report.biasFinalBody')}</p>
        <BiasTable rows={r.biasVsFinal} names={r.names} testId="bias-final" />
      </Card>

      {r.withFact > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-semibold">{t('report.missesTitle')}</h2>
            <ul className="flex flex-col gap-2 text-[15px]">
              {r.topMisses.map((m) => (
                <li key={m.key} className="flex justify-between gap-3">
                  <span className="truncate">
                    <span className="text-muted">{m.key}</span> {m.summary}
                  </span>
                  <span className="whitespace-nowrap tabular-nums text-muted">
                    {t('report.miss', { sp: m.finalSp, hours: m.hours.toFixed(0), implied: m.impliedSp.toFixed(1) })}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-1 font-semibold">{t('report.noFactTitle')}</h2>
            <p className="mb-3 text-[13px] text-muted">{t('report.noFactBody')}</p>
            {r.drift.length > 0 && (
              <ul className="mb-3 flex flex-col gap-1 text-[15px]">
                {r.drift.map((d) => (
                  <li key={d.key} className="flex justify-between">
                    <span className="text-muted">{t('report.drift', { key: d.key })}</span>
                    <span className="tabular-nums">
                      {d.first} → {d.last}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {r.unresolvedWithEstimate.length === 0 ? (
              <p className="text-[15px] text-muted">{t('report.allHaveFact')}</p>
            ) : (
              <ul className="flex flex-col gap-1 text-[15px]">
                {r.unresolvedWithEstimate.map((key) => (
                  <li key={key} className="flex items-center justify-between">
                    <span className="font-mono">{key}</span>
                    <Button variant="ghost" size="sm" onClick={() => exclude(key)}>
                      {t('report.exclude')}
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
