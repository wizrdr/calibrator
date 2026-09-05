import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { importHistory } from '@/data/queries'
import { toHistoryPayload } from '@/domain/historyPayload'
import { toJiraCsv } from '@/domain/jiraCsv'
import { generateSynthetic, type SynthParams } from '@/domain/synthetic'
import { Button, Card, ErrorText, Field, Input } from '@/ui'

export const DEMO_PARAMS: SynthParams = {
  sprints: 6,
  issuesPerSprint: 12,
  k: 4,
  sigmaIssue: 0.3,
  people: [
    { name: 'Ann', bias: 0.5, sigma: 0.25 },
    { name: 'Bob', bias: 1, sigma: 0.25 },
    { name: 'Cid', bias: 1.5, sigma: 0.25 },
  ],
  missingFactRate: 0.15,
  carryOverRate: 0.1,
  seed: 1,
}

// Demo data: fake sprints with known biases, so the report can be checked before real Jira data exists.
export function GeneratorPage() {
  const { teamId = '' } = useParams()
  const navigate = useNavigate()
  const [seed, setSeed] = useState(DEMO_PARAMS.seed)
  const [sprints, setSprints] = useState(DEMO_PARAMS.sprints)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [csv, setCsv] = useState<string | null>(null)

  const params: SynthParams = { ...DEMO_PARAMS, seed, sprints }

  async function seedTeam() {
    setBusy(true)
    setError(null)
    try {
      const out = generateSynthetic(params)
      await importHistory(teamId, toHistoryPayload(out))
      setCsv(toJiraCsv(out.jiraRows))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function download() {
    if (!csv) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `synthetic-seed-${seed}.csv`
    a.click()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Синтетика для демо</h1>
        <Link to={`/team/${teamId}`} className="text-sm text-muted hover:text-text">
          ← команда
        </Link>
      </div>
      <Card>
        <p className="mb-3 text-sm text-muted">
          Заводит в команду {sprints} спринтов по {DEMO_PARAMS.issuesPerSprint} задач с голосами трёх человек: Ann занижает вдвое, Bob точен,
          Cid завышает в полтора раза. Потом скачай CSV «факта» и импортируй его, чтобы отчёт увидел смещения.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Seed">
            <Input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} className="w-28" />
          </Field>
          <Field label="Спринтов">
            <Input type="number" min={1} max={20} value={sprints} onChange={(e) => setSprints(Number(e.target.value))} className="w-28" />
          </Field>
          <Button onClick={seedTeam} disabled={busy}>
            Создать сессии
          </Button>
          {csv && (
            <>
              <Button variant="secondary" onClick={download} data-testid="download-csv">
                Скачать CSV факта
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/team/${teamId}/import`)}>
                К импорту →
              </Button>
            </>
          )}
        </div>
        <ErrorText error={error} />
        {csv && <p className="mt-3 text-sm text-success" data-testid="seeded">Сессии созданы. CSV готов.</p>}
      </Card>
    </div>
  )
}
