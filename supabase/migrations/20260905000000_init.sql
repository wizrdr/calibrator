-- Calibrator: initial schema. The facilitator is the team owner (auth user);
-- participants are anonymous auth users (signInAnonymously), so every policy speaks auth.uid().

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  active boolean not null default true,
  unique (team_id, name)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  sprint_name text not null,
  join_code text not null unique default upper(encode(gen_random_bytes(4), 'hex')),
  state text not null default 'lobby' check (state in ('lobby', 'voting', 'revealed', 'done')),
  current_issue_id uuid null,
  round smallint not null default 1 check (round >= 1),
  created_at timestamptz not null default now()
);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  key text not null,
  summary text not null default '',
  order_idx integer not null default 0,
  final_sp numeric null,
  jira_sp numeric null,
  time_spent_sec integer null,
  sprints text[] null,
  status text null,
  resolved_at timestamptz null,
  imported_at timestamptz null,
  exclude_reason text null,
  unique (session_id, key)
);
create index issues_team_key on public.issues (team_id, key);

alter table public.sessions
  add constraint sessions_current_issue_fk
  foreign key (current_issue_id) references public.issues (id) on delete set null;

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null,
  display_name text not null,
  member_id uuid null references public.members (id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  issue_id uuid not null references public.issues (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  round smallint not null,
  card text not null check (card in ('1', '2', '3', '5', '8', '13', '?', 'coffee')),
  created_at timestamptz not null default now(),
  unique (issue_id, participant_id, round)
);

-- Helpers -------------------------------------------------------------------

create function public.is_owner(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from teams where id = t and owner_id = auth.uid())
$$;

create function public.is_session_owner(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from sessions se join teams t on t.id = se.team_id
    where se.id = s and t.owner_id = auth.uid()
  )
$$;

create function public.is_participant(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from participants where session_id = s and user_id = auth.uid())
$$;

create function public.is_revealed(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sessions where id = s and state in ('revealed', 'done'))
$$;

create function public.can_vote(s uuid, i uuid, p uuid, r smallint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from sessions se join participants pa on pa.session_id = se.id
    where se.id = s and se.state = 'voting' and se.current_issue_id = i and se.round = r
      and pa.id = p and pa.user_id = auth.uid()
  )
$$;

create function public.join_session(code text, name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select id into s_id from sessions where join_code = upper(trim(code));
  if s_id is null then
    raise exception 'no such session';
  end if;
  insert into participants (session_id, user_id, display_name)
  values (s_id, auth.uid(), trim(name))
  on conflict (session_id, user_id) do update set display_name = excluded.display_name;
  return s_id;
end
$$;

revoke all on function public.join_session(text, text) from public, anon;
grant execute on function public.join_session(text, text) to authenticated;

-- RLS -----------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.members enable row level security;
alter table public.sessions enable row level security;
alter table public.issues enable row level security;
alter table public.participants enable row level security;
alter table public.votes enable row level security;

create policy teams_owner on public.teams
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy members_owner on public.members
  for all using (is_owner(team_id)) with check (is_owner(team_id));

create policy sessions_read on public.sessions
  for select using (is_owner(team_id) or is_participant(id));
create policy sessions_write on public.sessions
  for insert with check (is_owner(team_id));
create policy sessions_update on public.sessions
  for update using (is_owner(team_id)) with check (is_owner(team_id));
create policy sessions_delete on public.sessions
  for delete using (is_owner(team_id));

create policy issues_read on public.issues
  for select using (is_owner(team_id) or is_participant(session_id));
create policy issues_write on public.issues
  for insert with check (is_owner(team_id));
create policy issues_update on public.issues
  for update using (is_owner(team_id)) with check (is_owner(team_id));
create policy issues_delete on public.issues
  for delete using (is_owner(team_id));

create policy participants_read on public.participants
  for select using (is_session_owner(session_id) or is_participant(session_id));
create policy participants_update on public.participants
  for update using (is_session_owner(session_id) or user_id = auth.uid())
  with check (is_session_owner(session_id) or user_id = auth.uid());
create policy participants_delete on public.participants
  for delete using (is_session_owner(session_id));

create policy votes_read on public.votes
  for select using (
    is_session_owner(session_id)
    or exists (select 1 from participants p where p.id = participant_id and p.user_id = auth.uid())
    or (is_participant(session_id) and is_revealed(session_id))
  );
create policy votes_write on public.votes
  for insert with check (can_vote(session_id, issue_id, participant_id, round));
create policy votes_update on public.votes
  for update using (can_vote(session_id, issue_id, participant_id, round))
  with check (can_vote(session_id, issue_id, participant_id, round));

-- Realtime ------------------------------------------------------------------

alter publication supabase_realtime add table public.sessions, public.issues, public.participants, public.votes;
