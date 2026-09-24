/**
 * Online multiplayer service — rooms, lobby, play moves via Edge Function.
 * Server validates every move; client never mutates authoritative state.
 */

import { getSupabase, isSupabaseConfigured } from './supabase';
import { useSettingsStore } from '../store/settingsStore';
import { useGameCatalogStore } from '../store/gameCatalogStore';
import type { GameState } from '../game/types';
import type { BluffState } from '../game/bluff';
import type { CatalogGameId } from '../store/gameCatalogStore';

export function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export async function ensureAnonymousSession(): Promise<string> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured) {
    throw new Error(
      'Online play needs Supabase. Add EXPO_PUBLIC_SUPABASE_URL and ANON_KEY in .env.'
    );
  }

  const { data: existing } = await sb.auth.getSession();
  if (existing.session?.user?.id) return existing.session.user.id;

  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    const msg = error.message || '';
    if (
      msg.toLowerCase().includes('anonymous') ||
      (error as { code?: string }).code === 'anonymous_provider_disabled'
    ) {
      throw new Error(
        'Anonymous sign-in is OFF in Supabase. Open Dashboard → Authentication → Providers → Anonymous → Enable.'
      );
    }
    throw new Error(msg || 'Could not sign in for online play.');
  }
  if (!data.user?.id) {
    throw new Error('Could not sign in for online play.');
  }
  return data.user.id;
}

/** Keep the player's name on this phone and in profiles so it is not asked again. */
export async function savePlayerName(displayName: string): Promise<void> {
  const trimmed = displayName.trim();
  if (!trimmed) return;

  useSettingsStore.getState().setDisplayName(trimmed);
  useSettingsStore.getState().setNameConfirmed(true);

  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured) return;
  try {
    const userId = await ensureAnonymousSession();
    await sb.from('profiles').upsert({
      id: userId,
      display_name: trimmed,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Local name is enough when online auth is unavailable.
  }
}

/** Pull the saved profile name. Local name wins if the database still has the default. */
export async function loadPlayerName(): Promise<void> {
  const settings = useSettingsStore.getState();
  const local = settings.displayName.trim();
  const localReady =
    settings.nameConfirmed || (local.length > 0 && local !== 'Player');

  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured) {
    if (localReady) settings.setNameConfirmed(true);
    return;
  }

  try {
    const userId = await ensureAnonymousSession();
    const { data } = await sb
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle();

    const remote = (data?.display_name ?? '').trim();
    if (remote && remote !== 'Player') {
      settings.setDisplayName(remote);
      settings.setNameConfirmed(true);
      return;
    }

    if (localReady) {
      settings.setNameConfirmed(true);
      await sb.from('profiles').upsert({
        id: userId,
        display_name: local,
        updated_at: new Date().toISOString(),
      });
    }
  } catch {
    if (localReady) settings.setNameConfirmed(true);
  }
}

export async function createRoom(displayName: string): Promise<{
  gameId: string;
  roomCode: string;
}> {
  return createRoomInternal(displayName, generateRoomCode(), false);
}

/** Public matchmaking rooms use an MM-prefixed code so Quick Match can find them. */
function generateMatchRoomCode(): string {
  return `MM${generateRoomCode().slice(0, 3)}`;
}

async function createRoomInternal(
  displayName: string,
  roomCode: string,
  matchmaking: boolean
): Promise<{ gameId: string; roomCode: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured) {
    throw new Error(
      'Online play needs Supabase. Add EXPO_PUBLIC_SUPABASE_URL and ANON_KEY in .env.'
    );
  }

  const userId = await ensureAnonymousSession();

  const { error: profileError } = await sb.from('profiles').upsert({
    id: userId,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  });
  if (profileError) {
    throw new Error(profileError.message || 'Could not save profile.');
  }

  const { data: game, error } = await sb
    .from('games')
    .insert({
      room_code: roomCode,
      status: 'lobby',
      max_players: 4,
      host_id: userId,
      game_state: null,
      game_type: useGameCatalogStore.getState().selectedGameId as CatalogGameId,
    })
    .select('id, room_code')
    .single();

  if (error || !game) {
    throw new Error(error?.message || 'Could not create room.');
  }

  const { error: joinError } = await sb.from('game_players').insert({
    game_id: game.id,
    player_id: userId,
    seat_number: 1,
    status: 'waiting',
    is_ready: matchmaking,
    display_name: displayName,
  });

  if (joinError) {
    throw new Error(joinError.message || 'Could not seat host in room.');
  }

  return { gameId: game.id, roomCode: game.room_code };
}

/**
 * Find an open Quick Match table (needs 4 humans) or open a new one.
 * Seats you with other players who are also searching.
 */
export async function quickMatch(displayName: string): Promise<{
  gameId: string;
  roomCode: string;
}> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured) {
    throw new Error(
      'Online play needs Supabase. Add EXPO_PUBLIC_SUPABASE_URL and ANON_KEY in .env.'
    );
  }

  const userId = await ensureAnonymousSession();
  const name = displayName.trim() || 'Player';

  await sb.from('profiles').upsert({
    id: userId,
    display_name: name,
    updated_at: new Date().toISOString(),
  });

  // Prefer an existing open matchmaking lobby with free seats (same game type).
  const gameType = useGameCatalogStore.getState().selectedGameId as CatalogGameId;
  const { data: openGames, error: listError } = await sb
    .from('games')
    .select('id, room_code, max_players, game_type')
    .eq('status', 'lobby')
    .eq('game_type', gameType)
    .like('room_code', 'MM%')
    .order('created_at', { ascending: true })
    .limit(12);

  if (listError) {
    throw new Error(listError.message);
  }

  for (const game of openGames ?? []) {
    const { count } = await sb
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id);

    const n = count ?? 0;
    if (n >= (game.max_players ?? 4)) continue;

    // Already in this room?
    const { data: existing } = await sb
      .from('game_players')
      .select('id')
      .eq('game_id', game.id)
      .eq('player_id', userId)
      .maybeSingle();

    if (existing) {
      return { gameId: game.id, roomCode: game.room_code };
    }

    try {
      const joined = await joinRoom(game.room_code, name);
      await setReady(joined.gameId, true);
      return joined;
    } catch {
      // Full or raced — try next
    }
  }

  // No open table — host a new Quick Match lobby.
  return createRoomInternal(name, generateMatchRoomCode(), true);
}

export async function joinRoom(
  roomCode: string,
  displayName: string
): Promise<{ gameId: string; roomCode: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured) {
    throw new Error(
      'Online play needs Supabase. Add EXPO_PUBLIC_SUPABASE_URL and ANON_KEY in .env.'
    );
  }

  const userId = await ensureAnonymousSession();
  const code = roomCode.trim().toUpperCase();

  const { data: game, error } = await sb
    .from('games')
    .select('id, room_code, status, max_players')
    .eq('room_code', code)
    .in('status', ['lobby', 'waiting'])
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!game) throw new Error('No open room with that code.');

  const { count } = await sb
    .from('game_players')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', game.id);

  if ((count ?? 0) >= (game.max_players ?? 4)) {
    throw new Error('Room is full (max 4 players)');
  }

  // Check if already joined
  const { data: existing } = await sb
    .from('game_players')
    .select('id')
    .eq('game_id', game.id)
    .eq('player_id', userId)
    .maybeSingle();

  if (!existing) {
    const seat = (count ?? 0) + 1;
    if (seat > 4) throw new Error('Room is full (max 4 players)');

    const { error: profileError } = await sb.from('profiles').upsert({
      id: userId,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    });
    if (profileError) throw new Error(profileError.message);

    const { error: joinError } = await sb.from('game_players').insert({
      game_id: game.id,
      player_id: userId,
      seat_number: seat,
      status: 'waiting',
      is_ready: false,
      display_name: displayName,
    });

    if (joinError) {
      if (joinError.message?.includes('max') || joinError.code === '23514') {
        throw new Error('Room is full (max 4 players)');
      }
      throw new Error(joinError.message);
    }
  }

  return { gameId: game.id, roomCode: game.room_code };
}

export async function setReady(
  gameId: string,
  ready: boolean
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const userId = await ensureAnonymousSession();
  if (!userId) return;

  await sb
    .from('game_players')
    .update({ is_ready: ready })
    .eq('game_id', gameId)
    .eq('player_id', userId);
}

export async function leaveRoom(gameId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const userId = await ensureAnonymousSession();
  if (!userId) return;

  await sb
    .from('game_players')
    .delete()
    .eq('game_id', gameId)
    .eq('player_id', userId);
}

export async function startGame(gameId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { data, error } = await sb.functions.invoke('start-game', {
    body: { gameId },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

export async function playOnlineCard(
  gameId: string,
  cardId: string
): Promise<GameState> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');

  const { data, error } = await sb.functions.invoke('play-card', {
    body: { gameId, cardId },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data.state as GameState;
}

export type BluffMoveAction = 'play' | 'call' | 'pass';

export async function submitBluffMove(
  gameId: string,
  body: {
    action: BluffMoveAction;
    cardIds?: string[];
    claimedRank?: string;
  }
): Promise<BluffState> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');

  const { data, error } = await sb.functions.invoke('bluff-move', {
    body: { gameId, ...body },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data.state as BluffState;
}

export async function fetchRoomCode(gameId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from('games')
    .select('room_code')
    .eq('id', gameId)
    .maybeSingle();
  return data?.room_code ?? null;
}

export type OnlineGameSnapshot = {
  status: string;
  gameType: 'thulla' | 'bluff';
  state: GameState | BluffState;
  updatedAt?: string;
};

export async function fetchGameState(
  gameId: string
): Promise<GameState | null> {
  const snap = await fetchOnlineSnapshot(gameId);
  if (!snap || snap.gameType === 'bluff') return null;
  return snap.state as GameState;
}

export async function fetchOnlineSnapshot(
  gameId: string
): Promise<OnlineGameSnapshot | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb.functions.invoke('get-game-state', {
    body: { gameId },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.state) return null;
  return {
    status: data.status,
    gameType: data.gameType === 'bluff' ? 'bluff' : 'thulla',
    state: data.state,
    updatedAt: data.updatedAt,
  };
}

export type LobbyPlayer = {
  id: string;
  player_id: string;
  seat_number: number;
  is_ready: boolean;
  display_name: string;
  status: string;
};

export async function fetchLobby(gameId: string): Promise<{
  game: {
    id: string;
    room_code: string;
    status: string;
    host_id: string;
    game_state: GameState | null;
    game_type?: CatalogGameId;
  };
  players: LobbyPlayer[];
} | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: game } = await sb
    .from('games')
    .select('id, room_code, status, host_id, game_state, game_type')
    .eq('id', gameId)
    .maybeSingle();

  if (!game) return null;

  const { data: players } = await sb
    .from('game_players')
    .select('id, player_id, seat_number, is_ready, display_name, status')
    .eq('game_id', gameId)
    .order('seat_number');

  return {
    game: {
      ...game,
      game_type: (game.game_type as CatalogGameId) || 'thulla',
    },
    players: (players as LobbyPlayer[]) ?? [],
  };
}
