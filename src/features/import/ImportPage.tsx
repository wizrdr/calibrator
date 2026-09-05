import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { applyFacts } from '@/data/queries'
import { matchImport, type ImportPreview } from '@/domain/importFacts'
import { parseJiraCsv, parseJiraDate } from '@/domain/jiraCsv'
import { useTeam } from '@/features/team/useTeam'
import { useT } from '@/i18n'
import { Button, Card, ErrorText, PageHeader, Stat } from '@/ui'

export function ImportPage() {
  const { t } = useT()
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
      <PageHeader title={t('import.title')} subtitle={t('import.subtitle', { n: issues.length })} />
      <ErrorText error={error} />
      <Card className="flex flex-col gap-3">
        <ol className="flex flex-col gap-1 text-[15px] text-muted">
          <li>{t('import.step1')}</li>
          <li>{t('import.step2')}</li>
          <li>{t('import.step3')}</li>
        </ol>
        <input type="file" accept=".csv,text/csv" data-testid="csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-[15px]" />
      </Card>

      {preview && (
        <Card className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" data-testid="preview">
            <Stat label={t('import.matched')} value={String(preview.matched.length)} />
            <Stat label={t('import.withHours')} value={String(preview.withFact)} />
            <Stat label={t('import.coverage')} value={`${Math.round(preview.coverage * 100)}%`} testId="coverage" sub={t('import.coverageSub')} />
            <Stat label={t('import.unmatched')} value={String(preview.unmatchedKeys.length)} sub={t('import.skip')} />
          </div>
          {preview.missingKeys.length > 0 && (
            <p className="text-[13px] text-muted">
              {t('import.missing')} <span className="font-mono">{preview.missingKeys.join(', ')}</span>
            </p>
          )}
          {preview.unmatchedKeys.length > 0 && (
            <p className="text-[13px] text-muted">
              {t('import.extra')} <span className="font-mono">{preview.unmatchedKeys.slice(0, 20).join(', ')}</span>
              {preview.unmatchedKeys.length > 20 && ' …'}
            </p>
          )}
          <div className="max-h-72 overflow-auto rounded-md border border-border">
            <table className="w-full text-[14px]">
              <thead className="sticky top-0 bg-surface-raised text-left text-[13px] text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('import.key')}</th>
                  <th className="px-3 py-2 font-medium">{t('import.sp')}</th>
                  <th className="px-3 py-2 font-medium">{t('import.hours')}</th>
                  <th className="px-3 py-2 font-medium">{t('import.sprints')}</th>
                  <th className="px-3 py-2 font-medium">{t('import.status')}</th>
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
              {t('import.apply', { n: preview.matched.length })}
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}
