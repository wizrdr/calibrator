import { Link, useParams } from 'react-router-dom'
import { isFacilitator, useAuth } from '@/features/auth/useAuth'
import { Card, ErrorText } from '@/ui'
import { FacilitatorView } from './FacilitatorView'
import { ParticipantView } from './ParticipantView'
import { useRoom } from './useRoom'

export function SessionPage() {
  const { sessionId = '' } = useParams()
  const { user } = useAuth()
  const { room, error, reload } = useRoom(sessionId)

  if (error) return <ErrorText error={error} />
  if (!room || !user) return <p className="text-sm text-muted">Загрузка…</p>

  if (isFacilitator(user)) return <FacilitatorView room={room} reload={reload} />

  const me = room.participants.find((p) => p.user_id === user.id)
  if (!me) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Ты не в этой сессии. <Link to="/join" className="text-accent">Войти по коду</Link>
        </p>
      </Card>
    )
  }
  return <ParticipantView room={room} me={me} reload={reload} />
}
