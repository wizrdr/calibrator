import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { applyFacts, listTeamIssues, type Issue } from '@/data/queries'
import { matchImport, type ImportPreview } from '@/domain/importFacts'
import { parseJiraCsv, parseJiraDate } from '@/domain/jiraCsv'
import { Button, Card, ErrorText } from '@/ui'

export function ImportPage() {
  const { teamId = '' } = useParams()
  const navigate = useNavigate()
  const [issues, setIssues] = useState<Issue[] | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listTeamIssues(teamId).then(setIssues).catch((e) => setError((e as Error).message))
  }, [teamId])

  async function onFile(file: File | undefined) {
    if (!file || !issues) return
    setError(null)
    try {
      setPreview(matchImport(parseJiraCsv(await file.text()), issues))
    } catch (e) {
      setError((e as Error).message)
      setPreview(null)
    }
  }

  async function apply() {
    if (!preview) return
    setBusy(true)
    try {
      await applyFacts(
        preview.matched.map(({ issueId, row }) => ({
          issueId,
          jira_sp: row.sp,
          time_spent_sec: row.timeSpentSec,
          sprints: row.sprints,
          status: row.status || null,
          resolved_at: parseJiraDate(row.resolved),
        })),
      )
      navigate(`/team/${teamId}/report`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Импорт факта из Jira</h1>
        <Link to={`/team/${teamId}`} className="text-sm text-muted hover:text-text">
          ← команда
        </Link>
      </div>
      <ErrorText error={error} />

      <Card>
        <p className="mb-3 text-sm text-muted">
          Экспорт CSV из Jira (Issues → Export → CSV, all fields). Нужны колонки Issue key, Story Points, Time Spent, Sprint, Status,
          Resolved. Строки матчатся по ключу с задачами этой команды: {issues?.length ?? '…'} оценённых.
        </p>
        <input type="file" accept=".csv,text/csv" data-testid="csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
      </Card>

      {preview && (
        <Card>
          <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4" data-testid="preview">
            <Stat label="Совпало" value={String(preview.matched.length)} />
            <Stat label="С фактом" value={String(preview.withFact)} />
            <Stat label="Coverage" value={`${Math.round(preview.coverage * 100)}%`} testId="coverage" />
            <Stat label="Не в командe" value={String(preview.unmatchedKeys.length)} />
          </dl>
          {preview.missingKeys.length > 0 && (
            <p className="mb-2 text-sm text-muted">
              Оценены, но нет в CSV: <span className="font-mono">{preview.missingKeys.join(', ')}</span>
            </p>
          )}
          {preview.unmatchedKeys.length > 0 && (
            <p className="mb-2 text-sm text-muted">
              В CSV, но не оценивались (пропустим): <span className="font-mono">{preview.unmatchedKeys.slice(0, 20).join(', ')}</span>
              {preview.unmatchedKeys.length > 20 && ' …'}
            </p>
          )}
          <div className="max-h-72 overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-raised text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Ключ</th>
                  <th className="px-3 py-2">SP</th>
                  <th className="px-3 py-2">Часы</th>
                  <th className="px-3 py-2">Спринты</th>
                  <th className="px-3 py-2">Статус</th>
                </tr>
              </thead>
              <tbody>
                {preview.matched.map(({ issueId, row }) => (
                  <tr key={issueId} className="border-t border-border">
                    <td className="px-3 py-1.5 font-mono">{row.key}</td>
                    <td className="px-3 py-1.5 tabular-nums">{row.sp ?? '—'}</td>
                    <td className="px-3 py-1.5 tabular-nums">{row.timeSpentSec ? (row.timeSpentSec / 3600).toFixed(1) : '—'}</td>
                    <td className="px-3 py-1.5 text-muted">{row.sprints.length}</td>
                    <td className="px-3 py-1.5 text-muted">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={apply} disabled={busy || preview.matched.length === 0}>
              Применить к {preview.matched.length} задачам
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums" data-testid={testId}>
        {value}
      </dd>
    </div>
  )
}
