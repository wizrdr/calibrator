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

export async function startVoting(sessionId: string, issueId: string, round = 1): Promise<void> {
  unwrap(await supabase.from('sessions').update({ state: 'voting', current_issue_id: issueId, round }).eq('id', sessionId).select())
}

export async function reveal(sessionId: string): Promise<void> {
  unwrap(await supabase.from('sessions').update({ state: 'revealed' }).eq('id', sessionId).select())
}

export async function setFinal(issueId: string, finalSp: number | null): Promise<void> {
  unwrap(await supabase.from('issues').update({ final_sp: finalSp }).eq('id', issueId).select())
}

export async function finishSession(sessionId: string): Promise<void> {
  unwrap(await supabase.from('sessions').update({ state: 'done', current_issue_id: null }).eq('id', sessionId).select())
}

export type CastVote = { sessionId: string; issueId: string; participantId: string; round: number; card: string }

export async function castVote(v: CastVote): Promise<void> {
  unwrap(
    await supabase
      .from('votes')
      .upsert(
        { session_id: v.sessionId, issue_id: v.issueId, participant_id: v.participantId, round: v.round, card: v.card },
        { onConflict: 'issue_id,participant_id,round' },
      )
      .select(),
  )
}

export async function listTeamIssues(teamId: string): Promise<Issue[]> {
  return unwrap(await supabase.from('issues').select().eq('team_id', teamId).order('order_idx'))
}

export async function listTeamSessions(teamId: string): Promise<Session[]> {
  return unwrap(await supabase.from('sessions').select().eq('team_id', teamId))
}

export async function listTeamParticipants(teamId: string): Promise<Participant[]> {
  const sessions = await listTeamSessions(teamId)
  if (sessions.length === 0) return []
  return unwrap(await supabase.from('participants').select().in('session_id', sessions.map((s) => s.id)))
}

export async function listTeamVotes(teamId: string): Promise<Vote[]> {
  const sessions = await listTeamSessions(teamId)
  if (sessions.length === 0) return []
  return unwrap(await supabase.from('votes').select().in('session_id', sessions.map((s) => s.id)))
}

export type FactUpdate = {
  issueId: string
  jira_sp: number | null
  time_spent_sec: number | null
  sprints: string[]
  status: string | null
  resolved_at: string | null
}

export async function applyFacts(updates: FactUpdate[]): Promise<void> {
  const now = new Date().toISOString()
  await Promise.all(
    updates.map(({ issueId, ...fact }) =>
      supabase.from('issues').update({ ...fact, imported_at: now }).eq('id', issueId).select().then(unwrap),
    ),
  )
}

export async function assignMember(participantIds: string[], memberId: string | null): Promise<void> {
  unwrap(await supabase.from('participants').update({ member_id: memberId }).in('id', participantIds).select())
}

export async function setExcludeReason(issueId: string, reason: string | null): Promise<void> {
  unwrap(await supabase.from('issues').update({ exclude_reason: reason }).eq('id', issueId).select())
}
