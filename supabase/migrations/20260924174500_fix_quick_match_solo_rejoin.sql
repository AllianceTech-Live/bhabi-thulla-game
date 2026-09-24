-- Fix Quick Match: browsers were stuck re-joining their own solo MM lobbies,
-- so 3 tabs = 3 rooms. Also serialize create with an advisory lock.

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

  insert into public.profiles (id, display_name, updated_at)
  values (v_user, v_name, now())
  on conflict (id) do update
    set display_name = excluded.display_name,
        updated_at = now();

  -- One matchmaking lane per game type so concurrent browsers fill the same table.
  perform pg_advisory_xact_lock(hashtext('bhabi-mm-' || v_type));

  -- Leave solo / abandoned MM seats so we can merge into a shared table.
  -- Keep the seat only if that lobby already has other real players.
  for v_game_id, v_room in
    select g.id, g.room_code
    from public.games g
    join public.game_players me on me.game_id = g.id and me.player_id = v_user
    where g.status in ('lobby', 'waiting')
      and g.room_code like 'MM%'
      and g.game_type = v_type
  loop
    select count(*) into v_count
    from public.game_players
    where game_id = v_game_id;

    if v_count <= 1 then
      delete from public.game_players
      where game_id = v_game_id
        and player_id = v_user;

      -- Cancel empty lobby so it is not reused as a ghost table.
      if not exists (
        select 1 from public.game_players where game_id = v_game_id
      ) then
        update public.games
          set status = 'cancelled',
              updated_at = now()
        where id = v_game_id
          and status in ('lobby', 'waiting');
      end if;
    else
      -- Already at a real multi-player table — stay there.
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
  end loop;

  v_game_id := null;
  v_room := null;
  v_max := null;

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
  limit 1
  for update of g;

  if v_game_id is not null then
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

    if v_seat is not null then
      begin
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
      exception
        when unique_violation then
          null; -- fall through to create
      end;
    end if;
  end if;

  -- No open table with players — create one new public MM room.
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
        null;
    end;
  end loop;

  raise exception 'Could not create matchmaking room';
end;
$$;
