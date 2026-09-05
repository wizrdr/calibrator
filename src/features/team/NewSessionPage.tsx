import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSession } from '@/data/queries'
import { parseJiraCsv } from '@/domain/jiraCsv'
import { Button, Card, ErrorText, Field, Input, PageHeader, Textarea } from '@/ui'
import { parseIssueLines } from './parseIssueLines'
import { useTeam } from './useTeam'

export function NewSessionPage() {
  const { team, refresh } = useTeam()
  const navigate = useNavigate()
  const [sprint, setSprint] = useState('')
  const [issuesText, setIssuesText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!team) return
    setBusy(true)
    try {
      const s = await createSession(team.id, sprint.trim(), parseIssueLines(issuesText))
      await refresh()
      navigate(`/s/${s.id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
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

  const n = parseIssueLines(issuesText).length
  return (
    <>
      <PageHeader title="Новое планирование" subtitle="Задачи можно вставить списком или загрузить CSV бэклога из Jira." />
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Спринт">
            <Input value={sprint} onChange={(e) => setSprint(e.target.value)} placeholder="Sprint 42" required autoFocus />
          </Field>
          <Field label="Задачи" hint="По одной в строке: ключ, потом название. Ключ нужен, чтобы потом сопоставить с фактом из Jira.">
            <Textarea
              rows={9}
              value={issuesText}
              onChange={(e) => setIssuesText(e.target.value)}
              placeholder={'CAL-101 Форма входа\nCAL-102 Флаки-тест в CI'}
              className="font-mono text-sm"
            />
          </Field>
          <ErrorText error={error} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="text-[13px] text-muted">
              <span className="mr-2">или CSV бэклога:</span>
              <input type="file" accept=".csv,text/csv" data-testid="csv-backlog" onChange={(e) => onCsv(e.target.files?.[0])} />
            </label>
            <Button type="submit" size="lg" disabled={busy || n === 0}>
              Начать планирование{n > 0 ? ` · ${n} задач` : ''}
            </Button>
          </div>
        </form>
      </Card>
    </>
  )
}
