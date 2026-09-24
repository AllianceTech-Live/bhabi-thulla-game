import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { showAlert } from '@/src/services/dialogs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameChrome } from '@/src/components/game/GameChrome';
import { EscapeCelebration } from '@/src/components/game/EscapeCelebration';
import { GameTable } from '@/src/components/game/GameTable';
import { BluffOnlinePlay } from '@/src/components/game/BluffOnlinePlay';
import { TableLobbyControls } from '@/src/components/game/TableLobbyControls';
import { PlayerHand } from '@/src/components/game/PlayerHand';
import { AppButton } from '@/src/components/ui/AppButton';
import { GameBackground } from '@/src/components/table';
import { ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { GAME_THEME } from '@/src/constants/gameTheme';
import { GAME_TIMING } from '@/src/constants/timing';
import { chooseCard } from '@/src/game/ai/chooseCard';
import { isAceOfSpades } from '@/src/game/deck';
import { getPlayableCards } from '@/src/game/rules/playable';
import { buildLobbyTableState } from '@/src/game/lobbyTableState';
import type { BluffState } from '@/src/game/bluff';
import type { GameState } from '@/src/game/types';
import {
  ensureAnonymousSession,
  fetchLobby,
  fetchOnlineSnapshot,
  fetchRoomCode,
  leaveRoom,
  playOnlineCard,
  startGame,
  isQuickMatchRoom,
  isOnlineRaceError,
  errorMessage,
  type LobbyPlayer,
} from '@/src/services/online';
import { sanitizeGameStateForPlayer } from '@/src/game/engine/sanitize';
import { sanitizeBluffState } from '@/src/game/bluff';
import { getSupabase } from '@/src/services/supabase';
import { useEscapeCelebration } from '@/src/hooks/useEscapeCelebration';
import { useGameSfx } from '@/src/hooks/useGameSfx';
import { useRoomLayout } from '@/src/hooks/useRoomLayout';
import { useTableMusic } from '@/src/hooks/useTableMusic';
import { useTurnTimer } from '@/src/hooks/useTurnTimer';
import { playSfx, stopMusic } from '@/src/services/audio';
import { lockLandscapeOrientation } from '@/src/services/orientation';
import { triggerHaptic } from '@/src/services/haptics';
import { useGameStore } from '@/src/store/gameStore';

/**
 * Online table — wait for friends on the felt (Ludo-style), then play.
 */
export default function OnlineGameScreen() {
  const { id: gameId, code: codeParam } = useLocalSearchParams<{
    id: string;
    code?: string;
  }>();
  const insets = useSafeAreaInsets();
  const room = useRoomLayout();
  const [state, setState] = useState<GameState | null>(null);
  const [bluffState, setBluffState] = useState<BluffState | null>(null);
  const [phase, setPhase] = useState<'loading' | 'waiting' | 'playing'>(
    'loading'
  );
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [lobbyGameType, setLobbyGameType] = useState<'thulla' | 'bluff'>(
    'thulla'
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [autoOn, setAutoOn] = useState(false);
  const [fullTableCountdown, setFullTableCountdown] = useState<number | null>(
    null
  );
  const [roomCode, setRoomCode] = useState(
    typeof codeParam === 'string' ? codeParam : ''
  );
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const winSoundPlayed = useRef(false);
  const skipNextAutoPlay = useRef(false);
  const autoStartRef = useRef(false);
  const lobbyWaitStartedAt = useRef<number | null>(null);
  const { name: escapedName, dismiss: dismissEscape, holdResults } =
    useEscapeCelebration(state, userId ? [userId] : []);

  useEffect(() => {
    if (!gameId || roomCode) return;
    void fetchRoomCode(gameId).then((code) => {
      if (code) setRoomCode(code);
    });
  }, [gameId, roomCode]);

  const applyPlayingState = useCallback(
    (
      raw: GameState | BluffState,
      gameType: 'thulla' | 'bluff',
      viewerId: string | null
    ) => {
      setLobbyGameType(gameType);
      if (gameType === 'bluff') {
        const next = viewerId
          ? sanitizeBluffState(raw as BluffState, viewerId)
          : (raw as BluffState);
        setBluffState(next);
        setState(null);
        setPhase('playing');
        return;
      }
      const next = viewerId
        ? sanitizeGameStateForPlayer(raw as GameState, viewerId)
        : (raw as GameState);
      setState(next);
      setBluffState(null);
      setPhase('playing');
      useGameStore.setState({ state: next });
    },
    []
  );

  const syncPlaying = useCallback(async (): Promise<boolean> => {
    if (!gameId) return false;
    const started = Date.now();
    try {
      const snap = await fetchOnlineSnapshot(gameId);
      setLatencyMs(Date.now() - started);
      if (!snap) return false;
      applyPlayingState(snap.state, snap.gameType, userId);
      return true;
    } catch {
      return false;
    }
  }, [gameId, userId, applyPlayingState]);

  const syncLobby = useCallback(async () => {
    if (!gameId) return;
    const data = await fetchLobby(gameId);
    if (!data) return;
    setLobbyPlayers(data.players);
    const type = data.game.game_type === 'bluff' ? 'bluff' : 'thulla';
    setLobbyGameType(type);
    if (data.game.room_code) setRoomCode(data.game.room_code);

    if (data.game.status === 'playing' && data.game.game_state) {
      const ok = await syncPlaying();
      if (!ok && userId) {
        // Edge snapshot failed — still leave lobby using lobby payload.
        applyPlayingState(
          data.game.game_state as GameState | BluffState,
          type,
          userId
        );
      }
      return;
    }
    if (data.game.status === 'cancelled' || data.game.status === 'completed') {
      // Stale / merged-away lobby — jump back into Quick Match.
      if (isQuickMatchRoom(data.game.room_code)) {
        router.replace('/online/match');
      } else {
        router.replace('/online');
      }
      return;
    }
    if (data.game.status === 'lobby' || data.game.status === 'waiting') {
      setPhase('waiting');
      setState(null);
      setBluffState(null);
    }
  }, [gameId, syncPlaying, applyPlayingState, userId]);

  useEffect(() => {
    void ensureAnonymousSession()
      .then(setUserId)
      .catch(() => setUserId(null));
    void syncLobby();

    const sb = getSupabase();
    if (!sb || !gameId) return;

    const channel = sb
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          void syncLobby();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        () => {
          void syncLobby();
        }
      )
      .subscribe();

    const poll = setInterval(() => {
      void syncLobby();
    }, 2000);

    return () => {
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [gameId, syncLobby]);

  const me = state?.players.find((p) => p.id === userId);
  const isMyTurn = state?.currentTurnPlayerId === userId;

  useEffect(() => {
    if (!isMyTurn) setSelectedId(null);
  }, [isMyTurn]);

  useGameSfx(state, state?.trick.plays.length ?? 0, !state || phase !== 'playing');

  const gameOver = state?.phase === 'game_complete';
  useTableMusic(phase === 'playing' && Boolean(state) && !gameOver);

  useEffect(() => {
    if (state?.phase !== 'game_complete') {
      winSoundPlayed.current = false;
      return;
    }
    if (holdResults.current || escapedName) return;
    if (winSoundPlayed.current) return;
    winSoundPlayed.current = true;
    void stopMusic();
    if (me?.status === 'escaped') {
      void playSfx('win');
    } else if (me?.status === 'bhabhi') {
      void playSfx('error');
    }
    const t = setTimeout(() => router.replace('/game/results'), 700);
    return () => clearTimeout(t);
  }, [state?.phase, escapedName, holdResults, me?.status]);

  // Auto-deal: from the moment 2+ are seated, wait up to 10s then start
  // with 2, 3, or 4. If a 4th joins earlier, deal right away.
  useEffect(() => {
    if (phase !== 'waiting') {
      setFullTableCountdown(null);
      lobbyWaitStartedAt.current = null;
      return;
    }
    if (!userId || !gameId) return;
    const seated = lobbyPlayers.some((p) => p.player_id === userId);
    const count = lobbyPlayers.length;
    if (!seated || count < 2) {
      setFullTableCountdown(null);
      autoStartRef.current = false;
      lobbyWaitStartedAt.current = null;
      return;
    }
    if (starting || autoStartRef.current) {
      setFullTableCountdown(null);
      return;
    }

    if (lobbyWaitStartedAt.current == null) {
      lobbyWaitStartedAt.current = Date.now();
    }

    const elapsed = Date.now() - lobbyWaitStartedAt.current;
    const delayMs =
      count >= 4
        ? 800
        : Math.max(0, GAME_TIMING.lobbyAutoStartMs - elapsed);
    const totalSec = Math.max(delayMs === 0 ? 0 : 1, Math.ceil(delayMs / 1000));
    setFullTableCountdown(totalSec === 0 ? 0 : totalSec);
    const fireAt = Date.now() + delayMs;

    const tick = setInterval(() => {
      const leftMs = Math.max(0, fireAt - Date.now());
      setFullTableCountdown(Math.ceil(leftMs / 1000));
    }, 250);

    const fire = setTimeout(() => {
      if (autoStartRef.current) return;
      autoStartRef.current = true;
      setStarting(true);
      setFullTableCountdown(null);
      void startGame(gameId)
        .then(async () => {
          const ok = await syncPlaying();
          if (!ok) await syncLobby();
        })
        .catch(async (e) => {
          const msg = errorMessage(e);
          // Another client often starts first — treat as OK and sync.
          if (isOnlineRaceError(msg)) {
            const ok = await syncPlaying();
            if (!ok) await syncLobby();
            if (ok) return;
          }
          autoStartRef.current = false;
          showAlert('Could not start', msg);
        })
        .finally(() => setStarting(false));
    }, delayMs);

    return () => {
      clearInterval(tick);
      clearTimeout(fire);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lobbyPlayers used for count/seat only
  }, [
    phase,
    userId,
    lobbyPlayers.length,
    starting,
    gameId,
    syncPlaying,
    syncLobby,
  ]);

  const onLeaveTable = () => {
    if (!gameId) {
      router.replace('/online');
      return;
    }
    void leaveRoom(gameId).finally(() => {
      void stopMusic();
      router.replace('/online');
    });
  };

  const onPlay = async (cardId?: string) => {
    const id = cardId ?? selectedId;
    if (!id || !gameId || !isMyTurn || submitting) return;
    setSubmitting(true);
    try {
      const next = await playOnlineCard(gameId, id);
      setState(next);
      setSelectedId(null);
      await triggerHaptic('light');
    } catch {
      setSelectedId(null);
      await syncPlaying();
    } finally {
      setSubmitting(false);
    }
  };

  const onTurnTimeout = useCallback(() => {
    if (!gameId || !state || !me || submitting) return;
    skipNextAutoPlay.current = true;
    setAutoOn(true);
    void triggerHaptic('warning');
    void playSfx('pass_turn');
    try {
      const card = chooseCard({
        state,
        playerId: me.id,
        difficulty: 'medium',
      });
      setSubmitting(true);
      void playOnlineCard(gameId, card.id)
        .then(async (next) => {
          setState(next);
          setSelectedId(null);
          await triggerHaptic('light');
        })
        .catch(async () => {
          await syncPlaying();
        })
        .finally(() => setSubmitting(false));
    } catch {
      setSubmitting(false);
    }
  }, [gameId, state, me, submitting, syncPlaying]);

  const turnActive =
    phase === 'playing' &&
    Boolean(isMyTurn && !autoOn && !submitting && !gameOver && state);
  const turnKey =
    state && phase === 'playing' && !gameOver && state.currentTurnPlayerId
      ? `${state.currentTurnPlayerId}:${state.trick.plays.length}:${state.events.length}`
      : null;

  const { secondsLeft, progress: turnProgress } = useTurnTimer({
    turnKey,
    durationMs: GAME_TIMING.turnTimeoutMs,
    enableTimeout: turnActive,
    onTimeout: onTurnTimeout,
  });

  useEffect(() => {
    if (!autoOn || !isMyTurn || submitting || !state || !me || !gameId) return;
    if (phase !== 'playing') return;
    if (skipNextAutoPlay.current) {
      skipNextAutoPlay.current = false;
      return;
    }
    const playerId = me.id;
    const t = setTimeout(() => {
      try {
        const card = chooseCard({
          state,
          playerId,
          difficulty: 'medium',
        });
        setSubmitting(true);
        void playOnlineCard(gameId, card.id)
          .then(async (next) => {
            setState(next);
            setSelectedId(null);
            await triggerHaptic('light');
          })
          .catch(async () => {
            await syncPlaying();
          })
          .finally(() => setSubmitting(false));
      } catch {
        setSubmitting(false);
      }
    }, GAME_TIMING.aiThinkMs);
    return () => clearTimeout(t);
  }, [autoOn, isMyTurn, submitting, state, me, gameId, phase, syncPlaying]);

  if (phase === 'loading') {
    return (
      <GameBackground>
        <View style={[styles.loading, { paddingTop: insets.top }]}>
          <Text style={styles.muted}>Opening table…</Text>
          <AppButton title="Retry" onPress={() => void syncLobby()} />
        </View>
      </GameBackground>
    );
  }

  if (phase === 'waiting') {
    const preview = buildLobbyTableState(
      gameId ?? 'lobby',
      lobbyPlayers,
      userId
    );
    const localName =
      lobbyPlayers.find((p) => p.player_id === userId)?.display_name ?? 'You';

    return (
      <GameBackground>
        <View
          style={[
            styles.root,
            {
              paddingTop: insets.top,
              paddingBottom: Math.max(insets.bottom, 4),
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
          ]}
        >
          <View style={styles.tableWrap}>
            <GameTable
              state={preview}
              localPlayerId={userId}
              hideBottomSeat
              waitingRoom
            />
          </View>

          <View
            style={[styles.youTag, { left: room.edge, bottom: room.youBottom }]}
            pointerEvents="none"
          >
            <Text style={styles.youLabel}>{localName}</Text>
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>You</Text>
            </View>
          </View>

          <GameChrome
            roomCode={roomCode || 'ROOM'}
            latencyMs={null}
            statusLine={
              fullTableCountdown != null && fullTableCountdown > 0
                ? lobbyPlayers.length >= 4
                  ? `FULL · STARTS IN ${fullTableCountdown}s`
                  : `STARTS IN ${fullTableCountdown}s · ${lobbyPlayers.length}/4`
                : lobbyPlayers.length >= 4
                  ? 'TABLE FULL · STARTING'
                  : isQuickMatchRoom(roomCode)
                    ? `WAITING · ${lobbyPlayers.length}/4`
                    : lobbyGameType === 'bluff'
                      ? 'BLUFF · WAITING'
                      : 'WAITING FOR PLAYERS'
            }
            yourTurn={false}
            onExit={onLeaveTable}
          />

          <TableLobbyControls
            roomCode={roomCode || 'ROOM'}
            playerCount={lobbyPlayers.length}
            starting={starting}
            autoStartInSec={fullTableCountdown}
            quickMatch={isQuickMatchRoom(roomCode)}
            onLeave={onLeaveTable}
          />
        </View>
      </GameBackground>
    );
  }

  if (phase === 'playing' && lobbyGameType === 'bluff' && bluffState && userId) {
    return (
      <GameBackground>
        <BluffOnlinePlay
          gameId={gameId!}
          userId={userId}
          roomCode={roomCode || 'BLUFF'}
          initialState={bluffState}
          onState={setBluffState}
        />
      </GameBackground>
    );
  }

  if (!state) {
    return (
      <GameBackground>
        <View style={[styles.loading, { paddingTop: insets.top }]}>
          <Text style={styles.muted}>Connecting…</Text>
          <AppButton title="Retry" onPress={() => void syncPlaying()} />
        </View>
      </GameBackground>
    );
  }

  const roomCodeShown = roomCode || 'ROOM';

  const playableIds = (() => {
    if (!me || !state) return null;
    const opening =
      state.trick.plays.length === 0 &&
      state.discarded.length === 0 &&
      state.escapedOrder.length === 0 &&
      state.players.reduce((sum, p) => sum + p.hand.length, 0) === 52;
    if (opening) {
      const ace = me.hand.filter(isAceOfSpades);
      return ace.map((c) => c.id);
    }
    return getPlayableCards(me.hand, state.trick.leadSuit).map((c) => c.id);
  })();

  return (
    <GameBackground>
      <View
        style={[
          styles.root,
          {
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 4),
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <View style={styles.tableWrap} pointerEvents="box-none">
          <GameTable
            state={state}
            localPlayerId={userId}
            hideBottomSeat
            turnSeconds={secondsLeft}
            turnProgress={turnProgress}
            turnDurationSec={Math.round(GAME_TIMING.turnTimeoutMs / 1000)}
          />
        </View>

        {me && me.status === 'active' && (
          <View
            style={[
              styles.handDock,
              {
                left: room.gutter + room.edge,
                right: room.control + room.edge * 3,
                bottom: room.handBottom,
              },
            ]}
          >
            <PlayerHand
              hand={me.hand}
              leadSuit={state.trick.leadSuit}
              selectedId={selectedId}
              interactive={isMyTurn && !submitting}
              compact={room.compactHand}
              liftOnPress
              playableIds={playableIds}
              onSelect={(c) => {
                setSelectedId(c.id);
                void onPlay(c.id);
              }}
            />
          </View>
        )}

        {me && (
          <View
            style={[styles.youTag, { left: room.edge, bottom: room.youBottom }]}
            pointerEvents="none"
          >
            <Text style={styles.youLabel}>{me.name}</Text>
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>{me.hand.length}</Text>
            </View>
          </View>
        )}

        <GameChrome
          roomCode={roomCodeShown}
          latencyMs={latencyMs}
          statusLine={isMyTurn ? 'YOUR TURN' : 'Waiting…'}
          yourTurn={!!isMyTurn}
          onExit={() => {
            void stopMusic();
            void lockLandscapeOrientation();
            router.replace('/');
            setTimeout(() => void lockLandscapeOrientation(), 80);
          }}
          onAuto={() => {
            setAutoOn((on) => !on);
            void triggerHaptic('selection');
          }}
          autoActive={autoOn}
        />
        {escapedName ? (
          <EscapeCelebration name={escapedName} onDone={dismissEscape} />
        ) : null}
      </View>
    </GameBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  muted: {
    color: 'rgba(247,241,227,0.5)',
    textAlign: 'center',
    marginBottom: 16,
  },
  tableWrap: {
    ...StyleSheet.absoluteFill,
    zIndex: GAME_THEME.layers.playingTable,
  },
  handDock: {
    position: 'absolute',
    // Above GameChrome so web taps hit cards, not the HUD layer
    zIndex: GAME_THEME.layers.gameControls + 20,
    alignItems: 'center',
  },
  youTag: {
    position: 'absolute',
    zIndex: GAME_THEME.layers.gameControls,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8,11,11,0.9)',
    borderWidth: 1.5,
    borderColor: ART_DECO_PALETTE.gold,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    gap: 8,
  },
  youLabel: {
    color: ART_DECO_PALETTE.ivory,
    fontWeight: '800',
    fontSize: 13,
  },
  youBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: ART_DECO_PALETTE.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  youBadgeText: {
    color: '#1A120C',
    fontWeight: '900',
    fontSize: 11,
  },
});
