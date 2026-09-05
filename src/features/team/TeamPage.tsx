import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  addMember,
  createSession,
  getTeam,
  listMembers,
  listSessions,
  type Member,
  type Session,
  type Team,
} from '@/data/queries'
import { parseJiraCsv } from '@/domain/jiraCsv'
import { parseIssueLines } from './parseIssueLines'
import { MappingCard } from './MappingCard'
import { Button, Card, ErrorText, Field, Input, Textarea } from '@/ui'

export function TeamPage() {
  const { teamId = '' } = useParams()
  const navigate = useNavigate()
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [error, setError] = useState<string | null>(null)
  const [memberName, setMemberName] = useState('')
  const [sprint, setSprint] = useState('')
  const [issuesText, setIssuesText] = useState('')

  const reload = useCallback(async () => {
    try {
      const [t, m, s] = await Promise.all([getTeam(teamId), listMembers(teamId), listSessions(teamId)])
      setTeam(t)
      setMembers(m)
      setSessions(s)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [teamId])

  useEffect(() => {
    reload()
  }, [reload])

  async function submitMember(e: FormEvent) {
    e.preventDefault()
    try {
      await addMember(teamId, memberName.trim())
      setMemberName('')
      await reload()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function submitSession(e: FormEvent) {
    e.preventDefault()
    try {
      const s = await createSession(teamId, sprint.trim(), parseIssueLines(issuesText))
      navigate(`/s/${s.id}`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function onCsv(file: File | undefined) {
    if (!file) return
    try {
      const rows = parseJiraCsv(await file.text())
      setIssuesText(rows.map((r) => `${r.key} ${r.summary}`).join('\n'))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (!team) return <p className="text-sm text-muted">{error ?? 'Загрузка…'}</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">{team.name}</h1>
        <nav className="flex gap-4 text-sm">
          <Link to={`/team/${teamId}/import`} className="text-accent hover:underline">
            Импорт факта
          </Link>
          <Link to={`/team/${teamId}/report`} className="text-accent hover:underline">
            Отчёт
          </Link>
          <Link to={`/team/${teamId}/generator`} className="text-muted hover:text-text">
            Синтетика
          </Link>
          <Link to="/" className="text-muted hover:text-text">
            ← команды
          </Link>
        </nav>
      </div>
      <ErrorText error={error} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Ростер</h2>
          {members.length === 0 ? (
            <p className="mb-3 text-sm text-muted">Добавь людей, чтобы привязывать к ним голоса из разных сессий.</p>
          ) : (
            <ul className="mb-3 flex flex-wrap gap-2">
              {members.map((m) => (
                <li key={m.id} className="rounded-full border border-border px-3 py-1 text-sm">
                  {m.name}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={submitMember} className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Имя">
                <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} required />
              </Field>
            </div>
            <Button type="submit" variant="secondary">
              Добавить
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Сессии</h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted">Ещё не было.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link to={`/s/${s.id}`} className="flex justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-raised">
                    <span>{s.sprint_name}</span>
                    <span className="text-muted">
                      {s.state} · код {s.join_code}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <MappingCard teamId={teamId} members={members} />

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Новая сессия</h2>
        <form onSubmit={submitSession} className="flex flex-col gap-3">
          <Field label="Спринт">
            <Input value={sprint} onChange={(e) => setSprint(e.target.value)} placeholder="Sprint 42" required />
          </Field>
          <Field label="Задачи" hint="По одной в строке: ключ, затем название. Или загрузи CSV бэклога из Jira.">
            <Textarea
              rows={8}
              value={issuesText}
              onChange={(e) => setIssuesText(e.target.value)}
              placeholder={'CAL-101 Login form\nCAL-102 Fix flaky test'}
            />
          </Field>
          <div className="flex items-center justify-between">
            <input type="file" accept=".csv,text/csv" onChange={(e) => onCsv(e.target.files?.[0])} className="text-sm text-muted" />
            <Button type="submit">Создать сессию</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
