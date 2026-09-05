import { Link } from 'react-router-dom'
import { Button, Card, Empty, PageHeader } from '@/ui'
import { stateLabel, useTeam } from './useTeam'

export function HomePage() {
  const { team, sessions, issues, error } = useTeam()
  if (!team) return <p className="text-sm text-muted">{error ?? 'Загрузка…'}</p>

  const count = (sessionId: string) => issues.filter((i) => i.session_id === sessionId)
  return (
    <>
      <PageHeader
        title="Планирования"
        subtitle="Каждое планирование запоминает голос каждого. После спринта сверим их с фактом из Jira."
        actions={
          <Link to="/new">
            <Button size="lg">Новое планирование</Button>
          </Link>
        }
      />
      {sessions.length === 0 ? (
        <Empty title="Планирований пока не было">
          Создайте первое: назовите спринт, вставьте задачи из Jira и отправьте команде ссылку. Аккаунт нужен только вам.
        </Empty>
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
                      {stateLabel[s.state] ?? s.state} · {estimated} из {all.length} оценено
                      {s.state === 'done' && ` · факт у ${withFact}`}
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
