import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { playCard } from '../_shared/game/GameEngine.ts';
import type { GameState } from '../_shared/game/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { gameId, cardId } = await req.json();
    if (!gameId || !cardId) {
      return json({ error: 'gameId and cardId required' }, 400);
    }

    // Membership check
    const { data: membership } = await admin
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('player_id', user.id)
      .maybeSingle();

    if (!membership) {
      return json({ error: 'Not a member of this game' }, 403);
    }

    const { data: game, error: gameError } = await admin
      .from('games')
      .select('id, status, game_state')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return json({ error: 'Game not found' }, 404);
    }

    if (game.status !== 'playing') {
      return json({ error: 'Game is not in playing status' }, 400);
    }

    const state = game.game_state as GameState;
    if (!state) {
      return json({ error: 'Missing game state' }, 400);
    }

    // Server-authoritative validation
    const result = playCard(state, user.id, cardId);
    if (!result.success) {
      return json({ error: result.error ?? 'Illegal move' }, 400);
    }

    const next = result.state;

    // Persist full authoritative state (service role only path)
    const { count } = await admin
      .from('game_moves')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    const moveType = result.events.some((e) => e.type === 'thulla')
      ? 'thulla'
      : 'play';

    await admin.from('game_moves').insert({
      game_id: gameId,
      player_id: user.id,
      card_id: cardId,
      move_number: (count ?? 0) + 1,
      move_type: moveType,
    });

    const status =
      next.phase === 'game_complete' ? 'completed' : 'playing';

    await admin
      .from('games')
      .update({
        game_state: next,
        status,
        current_turn: next.currentTurnPlayerId,
        lead_suit: next.trick.leadSuit,
        bhabhi_id: next.bhabhiId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    // Sync cards_remaining (never expose other hands via this column alone)
    for (const p of next.players) {
      await admin
        .from('game_players')
        .update({
          cards_remaining: p.hand.length,
          status: p.status,
        })
        .eq('game_id', gameId)
        .eq('player_id', p.id);
    }

    const { sanitizeGameStateForPlayer } = await import(
      '../_shared/game/sanitize.ts'
    );
    return json({
      state: sanitizeGameStateForPlayer(next, user.id),
      events: result.events,
    });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Server error' },
      500
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
