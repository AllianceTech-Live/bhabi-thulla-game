import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { createGame } from '../_shared/game/GameEngine.ts';
import { createBluffGame } from '../_shared/game/bluff/engine.ts';

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
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

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
    } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { gameId } = await req.json();
    if (!gameId) return json({ error: 'gameId required' }, 400);

    const { data: membership } = await admin
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('player_id', user.id)
      .maybeSingle();

    if (!membership) return json({ error: 'Forbidden' }, 403);

    const { data: game } = await admin
      .from('games')
      .select('id, host_id, status, game_type, game_state')
      .eq('id', gameId)
      .single();

    if (!game) return json({ error: 'Game not found' }, 404);

    const isBluff = game.game_type === 'bluff';
    const gameType = isBluff ? 'bluff' : 'thulla';

    // Idempotent: concurrent / late callers get the live state instead of an error.
    if (game.status === 'playing' && game.game_state) {
      return json({ state: game.game_state, gameType, alreadyStarted: true });
    }

    const { data: players } = await admin
      .from('game_players')
      .select('player_id, display_name, seat_number')
      .eq('game_id', gameId)
      .order('seat_number');

    if (!players || players.length < 2) {
      return json({ error: 'Need at least 2 players' }, 400);
    }
    if (players.length > 4) {
      return json({ error: 'Max 4 players' }, 400);
    }

    // Online has no host Start — any seated player may trigger auto-deal.

    const configs = players.map((p) => ({
      id: p.player_id,
      name: p.display_name,
      type: 'human' as const,
    }));

    const state = isBluff
      ? createBluffGame({ gameId, playerConfigs: configs })
      : createGame({
          mode: 'online',
          gameId,
          playerConfigs: configs,
        });

    const { data: claimed } = await admin
      .from('games')
      .update({
        status: 'playing',
        game_state: state,
        current_turn: state.currentTurnPlayerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .in('status', ['lobby', 'waiting'])
      .select('id')
      .maybeSingle();

    // Lost the race — another client already started.
    if (!claimed) {
      const { data: current } = await admin
        .from('games')
        .select('game_state, game_type, status')
        .eq('id', gameId)
        .single();
      if (current?.status === 'playing' && current.game_state) {
        return json({
          state: current.game_state,
          gameType: current.game_type === 'bluff' ? 'bluff' : 'thulla',
          alreadyStarted: true,
        });
      }
      return json({ error: 'Could not start game' }, 409);
    }

    for (const p of state.players) {
      await admin
        .from('game_players')
        .update({
          status: 'active',
          cards_remaining: p.hand.length,
          is_ready: true,
        })
        .eq('game_id', gameId)
        .eq('player_id', p.id);
    }

    return json({ state, gameType });
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
