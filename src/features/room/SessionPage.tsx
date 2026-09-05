import { Link, useParams } from 'react-router-dom'
import { Shell } from '@/app/Shell'
import { isFacilitator, useAuth } from '@/features/auth/useAuth'
import { TeamProvider } from '@/features/team/useTeam'
import { useT } from '@/i18n'
import { Card, ErrorText } from '@/ui'
import { FacilitatorView } from './FacilitatorView'
import { ParticipantView } from './ParticipantView'
import { useRoom } from './useRoom'

export function SessionPage() {
  const { t } = useT()
  const { sessionId = '' } = useParams()
  const { user } = useAuth()
  const { room, error, reload } = useRoom(sessionId)

  if (error)
    return (
      <div className="p-6">
        <ErrorText error={error} />
      </div>
    )
  if (!room || !user) return <p className="p-6 text-sm text-muted">{t('common.loading')}</p>

  if (isFacilitator(user)) {
    return (
      <TeamProvider>
        <Shell>
          <FacilitatorView room={room} reload={reload} />
        </Shell>
      </TeamProvider>
    )
  }

  const me = room.participants.find((p) => p.user_id === user.id)
  if (!me) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Card>
          <p className="text-[15px] text-muted">
            {t('join.notInSession')}{' '}
            <Link to="/join" className="text-accent">
              {t('auth.joinByCode')}
            </Link>
          </p>
        </Card>
      </div>
    )
  }
  return <ParticipantView room={room} me={me} reload={reload} />
}
