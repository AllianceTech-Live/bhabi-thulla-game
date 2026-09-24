import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameChrome } from '@/src/components/game/GameChrome';
import { EscapeCelebration } from '@/src/components/game/EscapeCelebration';
import { GameTable } from '@/src/components/game/GameTable';
import { TableLobbyControls } from '@/src/components/game/TableLobbyControls';
import { PlayerHand } from '@/src/components/game/PlayerHand';
import { AppButton } from '@/src/components/ui/AppButton';
import { GameBackground } from '@/src/components/table';
import { ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { GAME_THEME } from '@/src/constants/gameTheme';
import { GAME_TIMING } from '@/src/constants/timing';
import { chooseCard } from '@/src/game/ai/chooseCard';
import { buildLobbyTableState } from '@/src/game/lobbyTableState';
import type { GameState } from '@/src/game/types';
import {
  ensureAnonymousSession,
  fetchGameState,
  fetchLobby,
  fetchRoomCode,
  leaveRoom,
  playOnlineCard,
  startGame,
  type LobbyPlayer,
} from '@/src/services/online';
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
  const [phase, setPhase] = useState<'loading' | 'waiting' | 'playing'>(
    'loading'
  );
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [autoOn, setAutoOn] = useState(false);
  const [roomCode, setRoomCode] = useState(
    typeof codeParam === 'string' ? codeParam : ''
  );
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const winSoundPlayed = useRef(false);
  const skipNextAutoPlay = useRef(false);
  const autoStartRef = useRef(false);
  const { name: escapedName, dismiss: dismissEscape, holdResults } =
    useEscapeCelebration(state, userId ? [userId] : []);

  useEffect(() => {
    if (!gameId || roomCode) return;
    void fetchRoomCode(gameId).then((code) => {
      if (code) setRoomCode(code);
    });
  }, [gameId, roomCode]);

  const syncPlaying = useCallback(async () => {
    if (!gameId) return;
    const started = Date.now();
    try {
      const next = await fetchGameState(gameId);
      setLatencyMs(Date.now() - started);
      if (next) {
        setState(next);
        setPhase('playing');
        useGameStore.setState({ state: next });
      }
    } catch {
      // Still in lobby / no state yet
    }
  }, [gameId]);

  const syncLobby = useCallback(async () => {
    if (!gameId) return;
    const data = await fetchLobby(gameId);
    if (!data) return;
    setLobbyPlayers(data.players);
    setHostId(data.game.host_id);
    if (data.game.room_code) setRoomCode(data.game.room_code);

    if (data.game.status === 'playing' && data.game.game_state) {
      await syncPlaying();
      return;
    }
    if (data.game.status === 'lobby' || data.game.status === 'waiting') {
      setPhase('waiting');
      setState(null);
    }
  }, [gameId, syncPlaying]);

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

    return () => {
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

  const onHostStart = async () => {
    if (!gameId || starting) return;
    if (lobbyPlayers.length < 2) {
      Alert.alert(
        'Need more players',
        'At least 2 players must join before you can start.'
      );
      return;
    }
    setStarting(true);
    try {
      await startGame(gameId);
      await syncPlaying();
    } catch (e) {
      Alert.alert(
        'Could not start',
        e instanceof Error ? e.message : 'Error'
      );
    } finally {
      setStarting(false);
    }
  };

  // Quick Match: host auto-starts when the table is full (4).
  useEffect(() => {
    if (!String(roomCode).startsWith('MM')) return;
    if (phase !== 'waiting') return;
    if (!userId || hostId !== userId) return;
    if (lobbyPlayers.length < 4) return;
    if (autoStartRef.current || starting || !gameId) return;
    autoStartRef.current = true;
    setStarting(true);
    void startGame(gameId)
      .then(() => syncPlaying())
      .catch((e) => {
        autoStartRef.current = false;
        Alert.alert(
          'Could not start',
          e instanceof Error ? e.message : 'Error'
        );
      })
      .finally(() => setStarting(false));
  }, [
    phase,
    userId,
    hostId,
    lobbyPlayers.length,
    roomCode,
    starting,
    gameId,
    syncPlaying,
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
    } catch (e) {
      void playSfx('error');
      Alert.alert('Move rejected', e instanceof Error ? e.message : 'Error');
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
        .catch((e) => {
          void playSfx('error');
          Alert.alert(
            'Move rejected',
            e instanceof Error ? e.message : 'Error'
          );
        })
        .finally(() => setSubmitting(false));
    } catch {
      setSubmitting(false);
    }
  }, [gameId, state, me, submitting]);

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
          .catch((e) => {
            void playSfx('error');
            Alert.alert(
              'Move rejected',
              e instanceof Error ? e.message : 'Error'
            );
          })
          .finally(() => setSubmitting(false));
      } catch {
        setSubmitting(false);
      }
    }, GAME_TIMING.aiThinkMs);
    return () => clearTimeout(t);
  }, [autoOn, isMyTurn, submitting, state, me, gameId, phase]);

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
    const isHost = !!(userId && hostId === userId);

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
            statusLine="WAITING FOR PLAYERS"
            yourTurn={false}
            onExit={onLeaveTable}
          />

          <TableLobbyControls
            roomCode={roomCode || 'ROOM'}
            playerCount={lobbyPlayers.length}
            isHost={isHost}
            starting={starting}
            onStart={() => void onHostStart()}
            onLeave={onLeaveTable}
          />
        </View>
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
              onSelect={(c) => {
                if (selectedId === c.id) {
                  void onPlay(c.id);
                } else {
                  setSelectedId(c.id);
                  void playSfx('card_select');
                }
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
    zIndex: GAME_THEME.layers.playerHand,
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
