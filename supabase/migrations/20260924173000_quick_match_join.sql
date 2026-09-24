-- Atomic Ludo-style Quick Match:
-- 1) Join fullest open MM lobby with free seats
-- 2) Else reuse an empty open MM lobby
-- 3) Else create a new MM room
-- Concurrent callers use FOR UPDATE SKIP LOCKED so only one fills each seat.

create or replace function public.quick_match_join(
  p_display_name text,
  p_game_type text default 'thulla'
)
returns table (out_game_id uuid, out_room_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_name text := nullif(trim(p_display_name), '');
  v_type text := coalesce(nullif(trim(p_game_type), ''), 'thulla');
  v_game_id uuid;
  v_room text;
  v_max int;
  v_seat int;
  v_count int;
  v_attempt int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if v_name is null or lower(v_name) in ('player', 'host', 'guest') then
    v_name := 'Player';
  end if;

  -- Keep profile in sync for seat labels
  insert into public.profiles (id, display_name, updated_at)
  values (v_user, v_name, now())
  on conflict (id) do update
    set display_name = excluded.display_name,
        updated_at = now();

  -- Already seated in an open MM lobby for this game type? Rejoin that.
  select g.id, g.room_code
    into v_game_id, v_room
  from public.games g
  join public.game_players gp on gp.game_id = g.id
  where gp.player_id = v_user
    and g.status in ('lobby', 'waiting')
    and g.room_code like 'MM%'
    and g.game_type = v_type
  order by g.updated_at desc
  limit 1;

  if v_game_id is not null then
    update public.game_players
      set display_name = v_name,
          is_ready = true,
          status = 'waiting'
    where game_id = v_game_id
      and player_id = v_user;
    out_game_id := v_game_id;
    out_room_code := v_room;
    return next;
    return;
  end if;

  -- Prefer lobbies that already have players (1..3), fullest first.
  select g.id, g.room_code, g.max_players
    into v_game_id, v_room, v_max
  from public.games g
  where g.status in ('lobby', 'waiting')
    and g.game_type = v_type
    and g.room_code like 'MM%'
    and (
      select count(*) from public.game_players gp where gp.game_id = g.id
    ) between 1 and coalesce(g.max_players, 4) - 1
  order by (
      select count(*) from public.game_players gp where gp.game_id = g.id
    ) desc,
    g.created_at asc
  for update of g skip locked
  limit 1;

  -- Else reuse an empty open MM lobby (avoid spawning endless rooms).
  if v_game_id is null then
    select g.id, g.room_code, g.max_players
      into v_game_id, v_room, v_max
    from public.games g
    where g.status in ('lobby', 'waiting')
      and g.game_type = v_type
      and g.room_code like 'MM%'
      and not exists (
        select 1 from public.game_players gp where gp.game_id = g.id
      )
    order by g.created_at asc
    for update of g skip locked
    limit 1;
  end if;

  if v_game_id is not null then
    select count(*) into v_count
    from public.game_players
    where game_id = v_game_id;

    if v_count >= coalesce(v_max, 4) then
      -- Lost a race; fall through to create
      v_game_id := null;
    else
      -- Next free seat (handle holes if someone left)
      select s.seat into v_seat
      from generate_series(1, coalesce(v_max, 4)) as s(seat)
      where not exists (
        select 1
        from public.game_players gp
        where gp.game_id = v_game_id
          and gp.seat_number = s.seat
      )
      order by s.seat
      limit 1;

      if v_seat is null then
        v_game_id := null;
      else
        insert into public.game_players (
          game_id, player_id, seat_number, status, is_ready, display_name
        ) values (
          v_game_id, v_user, v_seat, 'waiting', true, v_name
        );

        update public.games
          set updated_at = now()
        where id = v_game_id;

        out_game_id := v_game_id;
        out_room_code := v_room;
        return next;
        return;
      end if;
    end if;
  end if;

  -- No open table — create a new public MM room and seat as host.
  for v_attempt in 1..8 loop
    v_room := 'MM' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 3));
    begin
      insert into public.games (
        room_code, status, max_players, host_id, game_state, game_type
      ) values (
        v_room, 'lobby', 4, v_user, null, v_type
      )
      returning id into v_game_id;

      insert into public.game_players (
        game_id, player_id, seat_number, status, is_ready, display_name
      ) values (
        v_game_id, v_user, 1, 'waiting', true, v_name
      );

      out_game_id := v_game_id;
      out_room_code := v_room;
      return next;
      return;
    exception
      when unique_violation then
        -- room_code collision — retry
        null;
    end;
  end loop;

  raise exception 'Could not create matchmaking room';
end;
$$;

revoke all on function public.quick_match_join(text, text) from public;
grant execute on function public.quick_match_join(text, text) to authenticated, anon;

-- Optional hygiene: cancel empty MM lobbies older than 30 minutes
create or replace function public.cleanup_stale_match_lobbies()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  with doomed as (
    select g.id
    from public.games g
    where g.room_code like 'MM%'
      and g.status in ('lobby', 'waiting')
      and g.created_at < now() - interval '30 minutes'
      and not exists (
        select 1 from public.game_players gp where gp.game_id = g.id
      )
  )
  update public.games g
    set status = 'cancelled',
        updated_at = now()
  from doomed d
  where g.id = d.id;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.cleanup_stale_match_lobbies() from public;
grant execute on function public.cleanup_stale_match_lobbies() to authenticated, anon;
