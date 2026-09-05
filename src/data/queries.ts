import { supabase, type Row } from './supabase'

export type Team = Row<'teams'>
export type Member = Row<'members'>
export type Session = Row<'sessions'>
export type Issue = Row<'issues'>
export type Participant = Row<'participants'>
export type Vote = Row<'votes'>

function unwrap<T>(r: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (r.error) throw new Error(r.error.message)
  return r.data as NonNullable<T>
}

export const auth = {
  signIn: (email: string, password: string) => supabase.auth.signInWithPassword({ email, password }),
  signUp: (email: string, password: string) => supabase.auth.signUp({ email, password }),
  signOut: () => supabase.auth.signOut(),
  signInAnonymously: () => supabase.auth.signInAnonymously(),
}

export async function listTeams(): Promise<Team[]> {
  return unwrap(await supabase.from('teams').select().order('created_at'))
}

export async function createTeam(name: string): Promise<Team> {
  return unwrap(await supabase.from('teams').insert({ name }).select().single())
}

export async function getTeam(id: string): Promise<Team> {
  return unwrap(await supabase.from('teams').select().eq('id', id).single())
}

export async function listMembers(teamId: string): Promise<Member[]> {
  return unwrap(await supabase.from('members').select().eq('team_id', teamId).order('name'))
}

export async function addMember(teamId: string, name: string): Promise<Member> {
  return unwrap(await supabase.from('members').insert({ team_id: teamId, name }).select().single())
}

export async function listSessions(teamId: string): Promise<Session[]> {
  return unwrap(
    await supabase.from('sessions').select().eq('team_id', teamId).order('created_at', { ascending: false }),
  )
}

export type NewIssue = { key: string; summary: string }

export async function createSession(teamId: string, sprintName: string, issues: NewIssue[]): Promise<Session> {
  const session = unwrap(
    await supabase.from('sessions').insert({ team_id: teamId, sprint_name: sprintName }).select().single(),
  )
  if (issues.length > 0) {
    unwrap(
      await supabase.from('issues').insert(
        issues.map((i, idx) => ({ team_id: teamId, session_id: session.id, key: i.key, summary: i.summary, order_idx: idx })),
      ),
    )
  }
  return session
}

export async function joinSession(code: string, name: string): Promise<string> {
  return unwrap(await supabase.rpc('join_session', { code, name }))
}

export type Room = { session: Session; issues: Issue[]; participants: Participant[]; votes: Vote[] }

export async function loadRoom(sessionId: string): Promise<Room> {
  const [session, issues, participants, votes] = await Promise.all([
    supabase.from('sessions').select().eq('id', sessionId).single(),
    supabase.from('issues').select().eq('session_id', sessionId).order('order_idx'),
    supabase.from('participants').select().eq('session_id', sessionId).order('joined_at'),
    supabase.from('votes').select().eq('session_id', sessionId),
  ])
  return { session: unwrap(session), issues: unwrap(issues), participants: unwrap(participants), votes: unwrap(votes) }
}
