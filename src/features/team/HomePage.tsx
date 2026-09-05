import { Link } from 'react-router-dom'
import { useT, type Key } from '@/i18n'
import { Button, Card, Empty, PageHeader } from '@/ui'
import { useTeam } from './useTeam'

export function HomePage() {
  const { t } = useT()
  const { team, sessions, issues, error } = useTeam()
  if (!team) return <p className="text-sm text-muted">{error ?? t('common.loading')}</p>

  const count = (sessionId: string) => issues.filter((i) => i.session_id === sessionId)
  return (
    <>
      <PageHeader
        title={t('home.title')}
        subtitle={t('home.subtitle')}
        actions={
          <Link to="/new">
            <Button size="lg">{t('home.newPlanning')}</Button>
          </Link>
        }
      />
      {sessions.length === 0 ? (
        <Empty title={t('home.emptyTitle')}>{t('home.emptyBody')}</Empty>
      ) : (
        <Card className="p-0">
          <ul className="flex flex-col divide-y divide-border">
            {sessions.map((s) => {
              const all = count(s.id)
              const estimated = all.filter((i) => i.final_sp !== null).length
              const withFact = all.filter((i) => i.imported_at !== null).length
              return (
                <li key={s.id}>
                  <Link to={`/s/${s.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 hover:bg-surface-raised">
                    <span className="font-medium">{s.sprint_name}</span>
                    <span className="text-[13px] text-muted">
                      {t(`state.${s.state}` as Key)} · {t('home.estimated', { estimated, total: all.length })}
                      {s.state === 'done' && ` · ${t('home.withFact', { n: withFact })}`}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </>
  )
}
