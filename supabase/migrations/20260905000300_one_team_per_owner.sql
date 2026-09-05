-- This version gives a facilitator exactly one team; the constraint also stops a double-mounted
-- client from creating two of them in a race.
create unique index if not exists teams_one_per_owner on public.teams (owner_id);
