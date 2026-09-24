-- Tag rooms with which rules engine they use (shared table shell).
alter table public.games
  add column if not exists game_type text not null default 'thulla'
  check (game_type in ('thulla', 'bluff'));

create index if not exists games_game_type_idx on public.games (game_type);
