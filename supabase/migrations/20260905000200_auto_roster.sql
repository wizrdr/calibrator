-- Roster builds itself: joining by name creates or links the team member with that name,
-- so the facilitator only ever merges duplicates instead of mapping people by hand.

create or replace function public.join_session(code text, name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_session uuid;
  v_team uuid;
  v_member uuid;
  v_name text := trim(name);
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if v_name = '' then
    raise exception 'name is required';
  end if;
  select id, team_id into v_session, v_team from sessions where join_code = upper(trim(code));
  if v_session is null then
    raise exception 'no such session';
  end if;
  select m.id into v_member from members m where m.team_id = v_team and lower(m.name) = lower(v_name);
  if v_member is null then
    insert into members (team_id, name) values (v_team, v_name) returning id into v_member;
  end if;
  insert into participants (session_id, user_id, display_name, member_id)
  values (v_session, auth.uid(), v_name, v_member)
  on conflict (session_id, user_id) do update
    set display_name = excluded.display_name, member_id = excluded.member_id;
  return v_session;
end
$$;

create function public.merge_members(p_team uuid, p_from uuid, p_into uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner(p_team) then
    raise exception 'not the team owner';
  end if;
  if p_from = p_into then
    return;
  end if;
  if not exists (select 1 from members where id = p_from and team_id = p_team)
     or not exists (select 1 from members where id = p_into and team_id = p_team) then
    raise exception 'members must belong to the team';
  end if;
  update participants set member_id = p_into where member_id = p_from;
  delete from members where id = p_from;
end
$$;

revoke all on function public.merge_members(uuid, uuid, uuid) from public, anon;
grant execute on function public.merge_members(uuid, uuid, uuid) to authenticated;
