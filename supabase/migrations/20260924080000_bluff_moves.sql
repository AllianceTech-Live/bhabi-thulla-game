-- Allow Bluff move types + optional JSON payload for multi-card plays.
alter table public.game_moves
  drop constraint if exists game_moves_move_type_check;

alter table public.game_moves
  add constraint game_moves_move_type_check
  check (
    move_type in (
      'play',
      'thulla',
      'escape',
      'system',
      'bluff_play',
      'bluff_call',
      'bluff_pass'
    )
  );

alter table public.game_moves
  add column if not exists payload jsonb;

-- card_id can be null for call/pass (no single card)
alter table public.game_moves
  alter column card_id drop not null;
