import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { createGame } from '../_shared/game/GameEngine.ts';

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

    const { data: game } = await admin
      .from('games')
      .select('id, host_id, status')
      .eq('id', gameId)
      .single();

    if (!game) return json({ error: 'Game not found' }, 404);
    if (game.host_id !== user.id) {
      return json({ error: 'Only host can start' }, 403);
    }
    if (game.status === 'playing') {
      return json({ error: 'Already started' }, 400);
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

    const state = createGame({
      mode: 'online',
      gameId,
      playerConfigs: players.map((p) => ({
        id: p.player_id,
        name: p.display_name,
        type: 'human' as const,
      })),
    });

    await admin
      .from('games')
      .update({
        status: 'playing',
        game_state: state,
        current_turn: state.currentTurnPlayerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

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

    return json({ state });
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
