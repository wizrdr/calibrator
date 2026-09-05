import { Link, useParams } from 'react-router-dom'
import { Card } from '@/ui'

export function ReportPage() {
  const { teamId = '' } = useParams()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Отчёт</h1>
        <Link to={`/team/${teamId}`} className="text-sm text-muted hover:text-text">
          ← команда
        </Link>
      </div>
      <Card>
        <p className="text-sm text-muted">Скоро.</p>
      </Card>
    </div>
  )
}
