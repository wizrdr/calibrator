-- Participants may know WHO has voted before the reveal, never WHAT. The cards themselves stay
-- behind votes_read; this function leaks only participant ids. A vote also touches the session row
-- so every reader gets a realtime poke, since votes rows are invisible to other participants.

create function public.voted_participants(s uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select v.participant_id
  from votes v join sessions se on se.id = v.session_id
  where v.session_id = s and v.issue_id = se.current_issue_id and v.round = se.round
    and (is_participant(s) or is_session_owner(s))
$$;

revoke all on function public.voted_participants(uuid) from public, anon;
grant execute on function public.voted_participants(uuid) to authenticated;

alter table public.sessions add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_session() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update sessions set updated_at = now() where id = new.session_id;
  return new;
end
$$;

drop trigger if exists votes_touch_session on public.votes;
create trigger votes_touch_session after insert or update on public.votes
for each row execute function public.touch_session();
