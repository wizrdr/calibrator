import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSession } from '@/data/queries'
import { parseJiraCsv } from '@/domain/jiraCsv'
import { useT } from '@/i18n'
import { Button, Card, ErrorText, Field, Input, PageHeader, Textarea } from '@/ui'
import { parseIssueLines } from './parseIssueLines'
import { useTeam } from './useTeam'

export function NewSessionPage() {
  const { t } = useT()
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
      <PageHeader title={t('newSession.title')} subtitle={t('newSession.subtitle')} />
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t('newSession.sprint')}>
            <Input value={sprint} onChange={(e) => setSprint(e.target.value)} placeholder={t('newSession.sprintPlaceholder')} required autoFocus />
          </Field>
          <Field label={t('newSession.issues')} hint={t('newSession.issuesHint')}>
            <Textarea
              rows={9}
              value={issuesText}
              onChange={(e) => setIssuesText(e.target.value)}
              placeholder={t('newSession.issuesPlaceholder')}
              className="font-mono text-sm"
            />
          </Field>
          <ErrorText error={error} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="text-[13px] text-muted">
              <span className="mr-2">{t('newSession.orCsv')}</span>
              <input type="file" accept=".csv,text/csv" data-testid="csv-backlog" onChange={(e) => onCsv(e.target.files?.[0])} />
            </label>
            <Button type="submit" size="lg" disabled={busy || n === 0}>
              {n > 0 ? t('newSession.startCount', { n }) : t('newSession.start')}
            </Button>
          </div>
        </form>
      </Card>
    </>
  )
}
