import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { applyFacts } from '@/data/queries'
import { matchImport, type ImportPreview } from '@/domain/importFacts'
import { parseJiraCsv, parseJiraDate } from '@/domain/jiraCsv'
import { useTeam } from '@/features/team/useTeam'
import { Button, Card, ErrorText, PageHeader, Stat } from '@/ui'

export function ImportPage() {
  const { issues, refresh } = useTeam()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(file: File | undefined) {
    if (!file) return
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
      await refresh()
      navigate('/calibration')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Загрузить факт из Jira" subtitle={`Строки CSV сопоставим по ключу с ${issues.length} задачами, которые команда оценивала.`} />
      <ErrorText error={error} />
      <Card className="flex flex-col gap-3">
        <ol className="flex flex-col gap-1 text-[15px] text-muted">
          <li>1. В Jira: Issues → фильтр по спринту → Export → CSV (all fields).</li>
          <li>2. Нужны колонки Issue key, Story Points, Time Spent, Sprint, Status, Resolved.</li>
          <li>3. Загрузите файл сюда. Ничего не сохранится, пока не нажмёте «Применить».</li>
        </ol>
        <input type="file" accept=".csv,text/csv" data-testid="csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-[15px]" />
      </Card>

      {preview && (
        <Card className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" data-testid="preview">
            <Stat label="Совпало по ключу" value={String(preview.matched.length)} />
            <Stat label="Из них с часами" value={String(preview.withFact)} />
            <Stat label="Покрытие" value={`${Math.round(preview.coverage * 100)}%`} testId="coverage" sub="оценённых задач с фактом" />
            <Stat label="Не оценивались" value={String(preview.unmatchedKeys.length)} sub="пропустим" />
          </div>
          {preview.missingKeys.length > 0 && (
            <p className="text-[13px] text-muted">
              Оценены, но в CSV нет: <span className="font-mono">{preview.missingKeys.join(', ')}</span>
            </p>
          )}
          {preview.unmatchedKeys.length > 0 && (
            <p className="text-[13px] text-muted">
              В CSV, но не оценивались: <span className="font-mono">{preview.unmatchedKeys.slice(0, 20).join(', ')}</span>
              {preview.unmatchedKeys.length > 20 && ' …'}
            </p>
          )}
          <div className="max-h-72 overflow-auto rounded-md border border-border">
            <table className="w-full text-[14px]">
              <thead className="sticky top-0 bg-surface-raised text-left text-[13px] text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Ключ</th>
                  <th className="px-3 py-2 font-medium">SP</th>
                  <th className="px-3 py-2 font-medium">Часы</th>
                  <th className="px-3 py-2 font-medium">Спринтов</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
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
          <div className="flex justify-end">
            <Button size="lg" onClick={apply} disabled={busy || preview.matched.length === 0}>
              Применить к {preview.matched.length} задачам
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}
