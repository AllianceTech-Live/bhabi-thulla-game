import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  callBluff,
  passBluffTurn,
  playBluffCards,
  sanitizeBluffState,
} from '../_shared/game/bluff/engine.ts';
import type { BluffState } from '../_shared/game/bluff/types.ts';
import type { Rank } from '../_shared/game/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type BluffAction = 'play' | 'call' | 'pass';

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

    const body = await req.json();
    const gameId = body.gameId as string | undefined;
    const action = body.action as BluffAction | undefined;
    if (!gameId || !action) {
      return json({ error: 'gameId and action required' }, 400);
    }

    const { data: membership } = await admin
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('player_id', user.id)
      .maybeSingle();

    if (!membership) return json({ error: 'Not a member of this game' }, 403);

    const { data: game } = await admin
      .from('games')
      .select('id, status, game_state, game_type')
      .eq('id', gameId)
      .single();

    if (!game) return json({ error: 'Game not found' }, 404);
    if (game.status !== 'playing') {
      return json({ error: 'Game is not in playing status' }, 400);
    }
    if (game.game_type !== 'bluff') {
      return json({ error: 'Not a Bluff game' }, 400);
    }

    const state = game.game_state as BluffState;
    if (!state || state.kind !== 'bluff') {
      return json({ error: 'Missing Bluff state' }, 400);
    }

    let result;
    let moveType: string;
    let cardId: string | null = null;
    let payload: Record<string, unknown> = { action };

    if (action === 'play') {
      const cardIds = body.cardIds as string[] | undefined;
      const claimedRank = body.claimedRank as Rank | undefined;
      if (!cardIds?.length || !claimedRank) {
        return json({ error: 'cardIds and claimedRank required' }, 400);
      }
      result = playBluffCards(state, user.id, cardIds, claimedRank);
      moveType = 'bluff_play';
      cardId = cardIds[0] ?? null;
      payload = { action, cardIds, claimedRank };
    } else if (action === 'call') {
      result = callBluff(state, user.id);
      moveType = 'bluff_call';
    } else if (action === 'pass') {
      result = passBluffTurn(state, user.id);
      moveType = 'bluff_pass';
    } else {
      return json({ error: 'Invalid action' }, 400);
    }

    if (!result.success) {
      return json({ error: result.error ?? 'Illegal move' }, 400);
    }

    const next = result.state;

    const { count } = await admin
      .from('game_moves')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    await admin.from('game_moves').insert({
      game_id: gameId,
      player_id: user.id,
      card_id: cardId,
      move_number: (count ?? 0) + 1,
      move_type: moveType,
      payload,
    });

    const status = next.phase === 'game_complete' ? 'completed' : 'playing';

    await admin
      .from('games')
      .update({
        game_state: next,
        status,
        current_turn: next.currentTurnPlayerId,
        bhabhi_id: next.loserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    for (const p of next.players) {
      const finished = p.finishOrder != null;
      const isLoser = next.loserId === p.id;
      await admin
        .from('game_players')
        .update({
          cards_remaining: p.hand.length,
          status: isLoser
            ? 'bhabhi'
            : finished
              ? 'escaped'
              : 'active',
        })
        .eq('game_id', gameId)
        .eq('player_id', p.id);
    }

    const lastEvents = next.events.slice(-5);

    return json({
      state: sanitizeBluffState(next, user.id),
      events: lastEvents,
      gameType: 'bluff',
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
