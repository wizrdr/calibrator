// Live RLS check against the linked Supabase project. Reads .env.local. Run: node scripts/rls-check.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.split('=', 2).map((s) => s.trim())),
)
const URL_ = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY
const client = () => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } })

let failures = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
  if (!ok) failures++
}
const must = (r, what) => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`)
  return r.data
}

const lead = client()
const stamp = Date.now()
const email = `lead-${stamp}@calibrator.test`
const signUp = await lead.auth.signUp({ email, password: `pw-${stamp}-Xy9` })
if (signUp.error) throw signUp.error
check('facilitator signs up and gets a session', !!signUp.data.session)

const team = must(await lead.from('teams').insert({ name: 'RLS team' }).select().single(), 'team')
const session = must(
  await lead.from('sessions').insert({ team_id: team.id, sprint_name: 'Sprint 1' }).select().single(),
  'session',
)
const issues = must(
  await lead
    .from('issues')
    .insert([
      { team_id: team.id, session_id: session.id, key: 'RLS-1', summary: 'one', order_idx: 0 },
      { team_id: team.id, session_id: session.id, key: 'RLS-2', summary: 'two', order_idx: 1 },
    ])
    .select(),
  'issues',
)
const [i1, i2] = issues.sort((a, b) => a.order_idx - b.order_idx)
must(await lead.from('sessions').update({ state: 'voting', current_issue_id: i1.id }).eq('id', session.id), 'voting')

const stranger = client()
const strangerSessions = await stranger.from('sessions').select('id')
check('unauthenticated client sees no sessions', (strangerSessions.data ?? []).length === 0)
const strangerJoin = await stranger.rpc('join_session', { code: session.join_code, name: 'Eve' })
check('unauthenticated client cannot join', !!strangerJoin.error)

async function joinAs(name) {
  const c = client()
  const anon = await c.auth.signInAnonymously()
  if (anon.error) throw anon.error
  const sid = must(await c.rpc('join_session', { code: session.join_code.toLowerCase(), name }), `join ${name}`)
  const me = must(
    await c.from('participants').select('id').eq('session_id', sid).eq('user_id', anon.data.user.id).single(),
    `participant ${name}`,
  )
  return { c, sid, pid: me.id }
}
const ann = await joinAs('Ann')
const bob = await joinAs('Bob')
check('anonymous participant joins by code and lands in the right session', ann.sid === session.id && bob.sid === session.id)

const roster = must(await ann.c.from('participants').select('display_name').eq('session_id', session.id), 'roster')
check('participants see each other in the roster', roster.map((r) => r.display_name).sort().join() === 'Ann,Bob')

const wrongTeam = await ann.c.from('teams').select('id')
check('participant cannot read the team', (wrongTeam.data ?? []).length === 0)

const vote = (who, issue, card, round = 1) =>
  who.c.from('votes').upsert(
    { session_id: session.id, issue_id: issue.id, participant_id: who.pid, round, card },
    { onConflict: 'issue_id,participant_id,round' },
  )

check('ann votes on the current issue', !(await vote(ann, i1, '5')).error)
check('bob votes on the current issue', !(await vote(bob, i1, '3')).error)
check('ann cannot vote on a non-current issue', !!(await vote(ann, i2, '5')).error)
check('ann cannot vote in a future round', !!(await vote(ann, i1, '5', 2)).error)
const forged = await bob.c.from('votes').upsert(
  { session_id: session.id, issue_id: i1.id, participant_id: ann.pid, round: 1, card: '13' },
  { onConflict: 'issue_id,participant_id,round' },
)
check('bob cannot write a vote as ann', !!forged.error)

const annSees = must(await ann.c.from('votes').select('card, participant_id'), 'ann votes')
check('before reveal ann sees only her own vote', annSees.length === 1 && annSees[0].participant_id === ann.pid)
const leadSees = must(await lead.from('votes').select('card'), 'lead votes')
check('facilitator sees all votes before reveal', leadSees.length === 2)

check('ann can change her card before reveal', !(await vote(ann, i1, '8')).error)
const annNow = must(await ann.c.from('votes').select('card').eq('participant_id', ann.pid), 'ann card')
check('the change is an update, not a second row', annNow.length === 1 && annNow[0].card === '8')

must(await lead.from('sessions').update({ state: 'revealed' }).eq('id', session.id), 'reveal')
const afterReveal = must(await ann.c.from('votes').select('card'), 'revealed votes')
check('after reveal ann sees both votes', afterReveal.map((v) => v.card).sort().join() === '3,8')
const late = await vote(ann, i1, '13')
const annAfter = must(await ann.c.from('votes').select('card').eq('participant_id', ann.pid), 'ann after')
check('after reveal ann cannot change her vote', !!late.error || annAfter[0].card === '8')

const annIssues = must(await ann.c.from('issues').select('key'), 'issues')
check('participant reads the session issues', annIssues.length === 2)

must(await lead.from('teams').delete().eq('id', team.id), 'cleanup')
const gone = await lead.from('sessions').select('id').eq('id', session.id)
check('deleting the team cascades', (gone.data ?? []).length === 0)

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
