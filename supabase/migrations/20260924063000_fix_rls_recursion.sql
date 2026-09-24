-- Fix infinite RLS recursion on game_players / games / profiles.
-- Policies must not query the same table under RLS; use SECURITY DEFINER helpers.

create or replace function public.is_game_member(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.game_players gp
    where gp.game_id = gid
      and gp.player_id = auth.uid()
  );
$$;

create or replace function public.game_is_open_lobby(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.games g
    where g.id = gid
      and g.status in ('lobby', 'waiting')
  );
$$;

create or replace function public.shares_game_with(other_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.game_players a
    join public.game_players b on a.game_id = b.game_id
    where a.player_id = auth.uid()
      and b.player_id = other_id
  );
$$;

revoke all on function public.is_game_member(uuid) from public;
revoke all on function public.game_is_open_lobby(uuid) from public;
revoke all on function public.shares_game_with(uuid) from public;
grant execute on function public.is_game_member(uuid) to authenticated, anon;
grant execute on function public.game_is_open_lobby(uuid) to authenticated, anon;
grant execute on function public.shares_game_with(uuid) to authenticated, anon;

-- Recreate policies without self-referential RLS

drop policy if exists "profiles_select_own_or_same_game" on public.profiles;
create policy "profiles_select_own_or_same_game"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.shares_game_with(id)
  );

drop policy if exists "games_select_member" on public.games;
create policy "games_select_member"
  on public.games for select
  using (
    public.is_game_member(id)
    or status in ('lobby', 'waiting')
  );

drop policy if exists "games_update_member" on public.games;
create policy "games_update_member"
  on public.games for update
  using (public.is_game_member(id));

drop policy if exists "gp_select_same_game_or_lobby" on public.game_players;
create policy "gp_select_same_game_or_lobby"
  on public.game_players for select
  using (
    public.is_game_member(game_id)
    or public.game_is_open_lobby(game_id)
  );

drop policy if exists "moves_select_member" on public.game_moves;
create policy "moves_select_member"
  on public.game_moves for select
  using (public.is_game_member(game_id));
