import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { loadRoom, type Room } from '@/data/queries'
import { Card, ErrorText } from '@/ui'

export function SessionPage() {
  const { sessionId = '' } = useParams()
  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRoom(sessionId).then(setRoom).catch((e) => setError((e as Error).message))
  }, [sessionId])

  if (error) return <ErrorText error={error} />
  if (!room) return <p className="text-sm text-muted">Загрузка…</p>

  const joinUrl = `${location.origin}${import.meta.env.BASE_URL}j/${room.session.join_code}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">{room.session.sprint_name}</h1>
        <Link to={`/team/${room.session.team_id}`} className="text-sm text-muted hover:text-text">
          ← команда
        </Link>
      </div>
      <Card>
        <p className="text-sm text-muted">
          Ссылка для участников: <code className="font-mono text-text">{joinUrl}</code>
        </p>
        <p className="mt-2 text-sm text-muted">
          Состояние: {room.session.state} · участников: {room.participants.length} · задач: {room.issues.length}
        </p>
      </Card>
      <Card>
        <ol className="flex flex-col gap-1 text-sm">
          {room.issues.map((i) => (
            <li key={i.id} className="flex gap-3">
              <span className="font-mono text-muted">{i.key}</span>
              <span>{i.summary}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
