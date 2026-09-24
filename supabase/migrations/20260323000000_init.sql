-- Bhabi Thulla schema
-- No gambling, wallets, deposits, or real-money fields.

create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Player',
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Games
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  status text not null default 'lobby'
    check (status in ('lobby', 'waiting', 'playing', 'completed', 'cancelled')),
  max_players int not null default 4 check (max_players >= 2 and max_players <= 4),
  host_id uuid references auth.users (id),
  current_turn uuid,
  lead_suit text,
  round_number int not null default 1,
  winner_id uuid,
  bhabhi_id uuid,
  game_state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists games_room_code_idx on public.games (room_code);
create index if not exists games_status_idx on public.games (status);

-- Game players (max 4 enforced by trigger)
create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  player_id uuid not null references auth.users (id) on delete cascade,
  seat_number int not null check (seat_number >= 1 and seat_number <= 4),
  status text not null default 'waiting',
  is_ready boolean not null default false,
  display_name text not null default 'Player',
  cards_remaining int not null default 0,
  joined_at timestamptz not null default now(),
  unique (game_id, player_id),
  unique (game_id, seat_number)
);

create index if not exists game_players_game_id_idx on public.game_players (game_id);
create index if not exists game_players_player_id_idx on public.game_players (player_id);

-- Reject 5th player
create or replace function public.enforce_max_four_players()
returns trigger
language plpgsql
as $$
declare
  player_count int;
  max_p int;
begin
  select count(*) into player_count
  from public.game_players
  where game_id = new.game_id;

  select max_players into max_p
  from public.games
  where id = new.game_id;

  if player_count >= coalesce(max_p, 4) then
    raise exception 'Room is full (max % players)', coalesce(max_p, 4);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_max_four_players on public.game_players;
create trigger trg_max_four_players
  before insert on public.game_players
  for each row
  execute function public.enforce_max_four_players();

-- Moves audit log
create table if not exists public.game_moves (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  player_id uuid not null references auth.users (id),
  card_id text not null,
  move_number int not null,
  move_type text not null default 'play'
    check (move_type in ('play', 'thulla', 'escape', 'system')),
  created_at timestamptz not null default now()
);

create index if not exists game_moves_game_id_idx on public.game_moves (game_id);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_games_updated on public.games;
create trigger trg_games_updated
  before update on public.games
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_moves enable row level security;

-- Profiles: users manage own
create policy "profiles_select_own_or_same_game"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.game_players gp1
      join public.game_players gp2 on gp1.game_id = gp2.game_id
      where gp1.player_id = auth.uid() and gp2.player_id = profiles.id
    )
  );

create policy "profiles_upsert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Games: members only (lobby discoverable by room code without full state leak —
-- prefer get-game-state Edge Function for hands)
create policy "games_select_member"
  on public.games for select
  using (
    exists (
      select 1 from public.game_players gp
      where gp.game_id = games.id and gp.player_id = auth.uid()
    )
    or status in ('lobby', 'waiting')
  );

-- Note: game_state JSON may still be visible to members via SELECT.
-- Clients MUST use get-game-state Edge Function which sanitizes hands.
-- Harden further by moving game_state to a service-role-only table if needed.

create policy "games_insert_authenticated"
  on public.games for insert
  with check (auth.uid() = host_id);

create policy "games_update_member"
  on public.games for update
  using (
    exists (
      select 1 from public.game_players gp
      where gp.game_id = games.id and gp.player_id = auth.uid()
    )
  );

-- Game players
create policy "gp_select_same_game_or_lobby"
  on public.game_players for select
  using (
    exists (
      select 1 from public.game_players me
      where me.game_id = game_players.game_id and me.player_id = auth.uid()
    )
    or exists (
      select 1 from public.games g
      where g.id = game_players.game_id and g.status in ('lobby', 'waiting')
    )
  );

create policy "gp_insert_self"
  on public.game_players for insert
  with check (auth.uid() = player_id);

create policy "gp_update_self"
  on public.game_players for update
  using (auth.uid() = player_id);

create policy "gp_delete_self"
  on public.game_players for delete
  using (auth.uid() = player_id);

-- Moves: members can read; writes via service role / edge functions
create policy "moves_select_member"
  on public.game_moves for select
  using (
    exists (
      select 1 from public.game_players gp
      where gp.game_id = game_moves.game_id and gp.player_id = auth.uid()
    )
  );

-- Realtime
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;
