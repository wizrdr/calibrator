import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createTeam, listSessions, listTeamIssues, listTeams, type Issue, type Session, type Team } from '@/data/queries'

type TeamState = {
  team: Team | null
  sessions: Session[]
  issues: Issue[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const Ctx = createContext<TeamState | null>(null)

// One team per facilitator in this version: the first one is the home; it is created on first visit.
export function TeamProvider({ children }: { children: ReactNode }) {
  const [team, setTeam] = useState<Team | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const inflight = useRef<Promise<void> | null>(null)

  const refresh = useCallback(() => {
    if (inflight.current) return inflight.current
    inflight.current = (async () => {
      try {
        let teams = await listTeams()
        if (teams.length === 0) {
          // The unique index on owner_id turns a race into a duplicate error; re-list instead of failing.
          await createTeam('Моя команда').catch(() => undefined)
          teams = await listTeams()
        }
        const t = teams[0]
        const [s, i] = await Promise.all([listSessions(t.id), listTeamIssues(t.id)])
        setTeam(t)
        setSessions(s)
        setIssues(i)
        setError(null)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
        inflight.current = null
      }
    })()
    return inflight.current
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return <Ctx.Provider value={{ team, sessions, issues, loading, error, refresh }}>{children}</Ctx.Provider>
}

export function useTeam(): TeamState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTeam outside TeamProvider')
  return v
}

export const stateLabel: Record<string, string> = {
  lobby: 'ждём начала',
  voting: 'голосуем',
  revealed: 'вскрыто',
  done: 'завершено',
}

export function activeSession(sessions: Session[]): Session | null {
  return sessions.find((s) => s.state !== 'done') ?? null
}

export function needsFacts(sessions: Session[], issues: Issue[]): Session | null {
  return (
    sessions.find((s) => s.state === 'done' && issues.some((i) => i.session_id === s.id && i.imported_at === null)) ?? null
  )
}
