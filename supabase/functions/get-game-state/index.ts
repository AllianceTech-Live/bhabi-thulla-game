import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { sanitizeGameStateForPlayer } from '../_shared/game/sanitize.ts';
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
      .select('status, game_state, updated_at')
      .eq('id', gameId)
      .single();

    if (!game?.game_state) return json({ error: 'No state' }, 404);

    const sanitized = sanitizeGameStateForPlayer(
      game.game_state as GameState,
      user.id
    );

    return json({
      status: game.status,
      state: sanitized,
      updatedAt: game.updated_at,
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
