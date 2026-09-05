-- import_history lets the team owner load past sessions with per-person votes in one call:
-- demo/synthetic data today, migration from another poker tool tomorrow. Seeded participants
-- get a random user_id nobody can sign in as, so they only exist as identities for the report.

create or replace function public.import_history(p_team uuid, payload jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare
  s jsonb;
  i jsonb;
  v jsonb;
  m text;
  v_session uuid;
  v_issue uuid;
  v_part uuid;
  v_member uuid;
  v_count integer := 0;
begin
  if not is_owner(p_team) then
    raise exception 'not the team owner';
  end if;

  for m in select jsonb_array_elements_text(coalesce(payload->'members', '[]'::jsonb)) loop
    insert into members (team_id, name) values (p_team, m) on conflict (team_id, name) do nothing;
  end loop;

  for s in select jsonb_array_elements(coalesce(payload->'sessions', '[]'::jsonb)) loop
    insert into sessions (team_id, sprint_name, state)
    values (p_team, s->>'name', 'done') returning id into v_session;

    for i in select jsonb_array_elements(coalesce(s->'issues', '[]'::jsonb)) loop
      insert into issues (team_id, session_id, key, summary, order_idx, final_sp)
      values (p_team, v_session, i->>'key', coalesce(i->>'summary', ''), coalesce((i->>'order_idx')::int, 0), (i->>'final_sp')::numeric);
    end loop;

    for v in select jsonb_array_elements(coalesce(s->'votes', '[]'::jsonb)) loop
      select id into v_member from members where team_id = p_team and name = v->>'member';
      select id into v_part from participants where session_id = v_session and display_name = v->>'member';
      if v_part is null then
        insert into participants (session_id, user_id, display_name, member_id)
        values (v_session, gen_random_uuid(), v->>'member', v_member) returning id into v_part;
      end if;
      select id into v_issue from issues where session_id = v_session and key = v->>'key';
      if v_issue is null then
        continue;
      end if;
      insert into votes (session_id, issue_id, participant_id, round, card)
      values (v_session, v_issue, v_part, coalesce((v->>'round')::smallint, 1), v->>'card')
      on conflict (issue_id, participant_id, round) do update set card = excluded.card;
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end
$$;

revoke all on function public.import_history(uuid, jsonb) from public, anon;
grant execute on function public.import_history(uuid, jsonb) to authenticated;
