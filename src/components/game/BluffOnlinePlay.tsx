import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GameChrome } from '@/src/components/game/GameChrome';
import { GameTable } from '@/src/components/game/GameTable';
import { DealAnimation } from '@/src/components/game/DealAnimation';
import type { SeatOrigin } from '@/src/components/game/TrickPlayCard';
import { PlayerHand } from '@/src/components/game/PlayerHand';
import { AppButton } from '@/src/components/ui/AppButton';
import { ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { GAME_THEME } from '@/src/constants/gameTheme';
import { GAME_TIMING } from '@/src/constants/timing';
import { decideBluffMove, type BluffState } from '@/src/game/bluff';
import type { Card, GameState, Rank, TrickPlay } from '@/src/game/types';
import { RANKS } from '@/src/game/types';
import { useRoomLayout } from '@/src/hooks/useRoomLayout';
import { useTableMusic } from '@/src/hooks/useTableMusic';
import { useTurnTimer } from '@/src/hooks/useTurnTimer';
import {
  fetchOnlineSnapshot,
  leaveRoom,
  submitBluffMove,
} from '@/src/services/online';
import { playSfx, stopMusic } from '@/src/services/audio';
import { lockLandscapeOrientation } from '@/src/services/orientation';
import { triggerHaptic } from '@/src/services/haptics';

function seatOriginForPlayer(
  bluff: BluffState,
  localId: string | null,
  playerId: string
): SeatOrigin {
  const ordered = [...bluff.players].sort((a, b) => a.seat - b.seat);
  const local = ordered.find((p) => p.id === localId) ?? ordered[0]!;
  const localIndex = ordered.findIndex((p) => p.id === local.id);
  const idx = ordered.findIndex((p) => p.id === playerId);
  if (idx < 0 || localIndex < 0) return 'bottom';
  const offset = (idx - localIndex + ordered.length) % ordered.length;
  return (['bottom', 'left', 'top', 'right'] as const)[offset] ?? 'bottom';
}

function toTableState(bluff: BluffState): GameState {
  const plays: TrickPlay[] = bluff.lastPlay
    ? bluff.lastPlay.actualCards.map((card) => ({
        playerId: bluff.lastPlay!.playerId,
        card,
        isThulla: false,
      }))
    : [];

  return {
    id: bluff.id,
    mode: 'online',
    phase: bluff.phase === 'game_complete' ? 'game_complete' : 'playing',
    players: bluff.players.map((p) => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      type: p.type,
      status:
        p.finishOrder === bluff.players.length
          ? 'bhabhi'
          : p.finishOrder != null
            ? 'escaped'
            : 'active',
      hand: p.hand,
      aiDifficulty: p.aiDifficulty,
    })),
    currentTurnPlayerId: bluff.currentTurnPlayerId,
    trick: {
      leadSuit: null,
      plays,
      leaderId: bluff.lastPlay?.playerId ?? null,
    },
    discarded: [],
    events: [],
    escapedOrder: bluff.players
      .filter(
        (p) => p.finishOrder != null && p.finishOrder < bluff.players.length
      )
      .sort((a, b) => (a.finishOrder ?? 0) - (b.finishOrder ?? 0))
      .map((p) => p.id),
    bhabhiId: bluff.loserId,
    roundNumber: 1,
    handRevealed: true,
    createdAt: bluff.createdAt,
    updatedAt: bluff.updatedAt,
  };
}

type Props = {
  gameId: string;
  userId: string;
  roomCode: string;
  initialState: BluffState;
  onState: (state: BluffState) => void;
};

/**
 * Online Bluff table — server-authoritative moves via bluff-move edge.
 */
export function BluffOnlinePlay({
  gameId,
  userId,
  roomCode,
  initialState,
  onState,
}: Props) {
  const insets = useSafeAreaInsets();
  const room = useRoomLayout();
  const [state, setState] = useState<BluffState>(initialState);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [claimSheetOpen, setClaimSheetOpen] = useState(false);
  const [sheetRank, setSheetRank] = useState<Rank | null>(null);
  const [statusFlash, setStatusFlash] = useState('');
  const [collectTo, setCollectTo] = useState<SeatOrigin | null>(null);
  const [heldPlays, setHeldPlays] = useState<TrickPlay[] | null>(null);
  const [revealFaceUp, setRevealFaceUp] = useState(false);
  const [dealing, setDealing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const eventsLen = useRef(initialState.events.length);
  const dealShown = useRef(false);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  useEffect(() => {
    if (dealShown.current) return;
    dealShown.current = true;
    setDealing(true);
  }, []);

  const applyState = useCallback(
    (next: BluffState) => {
      setState(next);
      onState(next);
    },
    [onState]
  );

  const refresh = useCallback(async () => {
    const snap = await fetchOnlineSnapshot(gameId);
    if (snap?.gameType === 'bluff') {
      applyState(snap.state as BluffState);
    }
  }, [gameId, applyState]);

  // Peers refresh when parent syncs — also poll lightly when not our turn
  useEffect(() => {
    if (dealing || state.phase === 'game_complete') return;
    if (state.currentTurnPlayerId === userId) return;
    const t = setInterval(() => {
      void refresh();
    }, 2200);
    return () => clearInterval(t);
  }, [dealing, state.currentTurnPlayerId, state.phase, userId, refresh]);

  useTableMusic(!dealing && state.phase !== 'game_complete');

  useEffect(() => {
    if (dealing) return;
    if (state.events.length <= eventsLen.current) return;
    eventsLen.current = state.events.length;
    const last = state.events[state.events.length - 1];
    if (!last) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        if (last.type === 'bluff_play') {
          setStatusFlash(
            `Claimed ${String(last.payload?.claimedRank)} ×${String(last.payload?.count)}`
          );
          void playSfx('card_throw');
        } else if (last.type === 'bluff_pass') {
          setStatusFlash('Passed');
          void playSfx('pass_turn');
        } else if (last.type === 'bluff_call') {
          const honest = Boolean(last.payload?.honest);
          const takerId = String(last.payload?.takerId ?? '');
          const liarId = String(last.payload?.liarId ?? '');
          const claimedRank = String(last.payload?.claimedRank ?? 'A') as Rank;
          const raw =
            (last.payload?.revealedCards as
              | { id: string; suit: string; rank: string }[]
              | undefined) ?? [];
          setStatusFlash(
            honest
              ? 'Truth! Caller takes the pile'
              : 'Bluff! Liar takes the pile'
          );
          if (honest) void playSfx('error');
          void triggerHaptic('warning');
          const snapshot: TrickPlay[] =
            raw.length > 0
              ? raw.map((c) => ({
                  playerId: liarId || userId,
                  card: {
                    id: c.id,
                    suit: c.suit as TrickPlay['card']['suit'],
                    rank: c.rank as Rank,
                  },
                  isThulla: !honest,
                }))
              : [
                  {
                    playerId: liarId || userId,
                    card: {
                      id: `collect-${Date.now()}`,
                      suit: 'spades' as const,
                      rank: claimedRank,
                    },
                    isThulla: !honest,
                  },
                ];
          setHeldPlays(snapshot);
          setRevealFaceUp(true);
          timers.push(
            setTimeout(() => {
              setCollectTo(seatOriginForPlayer(state, userId, takerId));
            }, GAME_TIMING.thullaSlamMs)
          );
        } else if (last.type === 'game_complete') {
          void stopMusic();
          void playSfx(state.winnerId === userId ? 'win' : 'error');
        }
      }, 0)
    );
    return () => {
      for (const id of timers) clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.events.length, dealing]);

  const tableState = useMemo(() => toTableState(state), [state]);
  const visiblePlays = heldPlays ?? tableState.trick.plays;
  const me = state.players.find((p) => p.id === userId);
  const isMyTurn = state.currentTurnPlayerId === userId;
  const freeClaim = !state.requiredRank;
  const canCall = Boolean(
    !dealing && isMyTurn && me && state.lastPlay && state.lastPlay.playerId !== userId
  );
  const canPass = Boolean(!dealing && isMyTurn && me && state.lastPlay);
  const throwCount = selectedCardIds.length;
  const canThrow = throwCount >= 1 && throwCount <= 4;
  const cardsPerPlayer = Math.ceil(52 / state.players.length);

  const canInteract =
    !dealing &&
    isMyTurn &&
    Boolean(me && me.finishOrder == null) &&
    !collectTo &&
    !revealFaceUp &&
    !submitting &&
    state.phase === 'playing';

  const onTurnTimeout = useCallback(() => {
    if (submitting) return;
    setClaimSheetOpen(false);
    setSheetRank(null);
    void triggerHaptic('warning');
    void playSfx('pass_turn');
    const decision = decideBluffMove(state, userId);
    if (!decision) return;
    setSubmitting(true);
    const payload =
      decision.action === 'call'
        ? { action: 'call' as const }
        : {
            action: 'play' as const,
            cardIds: decision.cardIds,
            claimedRank: decision.claimedRank,
          };
    void submitBluffMove(gameId, payload)
      .then((next) => {
        setSelectedCardIds([]);
        applyState(next);
      })
      .catch((e) => {
        setLastError(e instanceof Error ? e.message : 'Auto-move failed');
        void playSfx('error');
      })
      .finally(() => setSubmitting(false));
  }, [submitting, state, userId, gameId, applyState]);

  const turnKey =
    !dealing &&
    state.phase === 'playing' &&
    !collectTo &&
    !revealFaceUp &&
    state.currentTurnPlayerId
      ? `${state.currentTurnPlayerId}:${state.events.length}:${state.pile.length}`
      : null;

  const { secondsLeft, progress: turnProgress } = useTurnTimer({
    turnKey,
    durationMs: GAME_TIMING.turnTimeoutMs,
    enableTimeout: canInteract,
    onTimeout: onTurnTimeout,
  });

  const toggleCard = (cardId: string) => {
    setSelectedCardIds((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= 4) return prev;
      return [...prev, cardId];
    });
  };

  const doThrow = async (rank: Rank) => {
    if (submitting || !canThrow) return;
    setSubmitting(true);
    setLastError(null);
    try {
      const next = await submitBluffMove(gameId, {
        action: 'play',
        cardIds: selectedCardIds,
        claimedRank: rank,
      });
      setSelectedCardIds([]);
      setClaimSheetOpen(false);
      setSheetRank(null);
      applyState(next);
      void playSfx('card_throw');
      void triggerHaptic('light');
    } catch (e) {
      setLastError(e instanceof Error ? e.message : 'Move failed');
      void playSfx('error');
    } finally {
      setSubmitting(false);
    }
  };

  const onPressThrow = () => {
    if (!canThrow) {
      void playSfx('error');
      return;
    }
    if (state.requiredRank) {
      void doThrow(state.requiredRank);
      return;
    }
    const first = me?.hand.find((c: Card) => c.id === selectedCardIds[0]);
    setSheetRank(first?.rank ?? null);
    setClaimSheetOpen(true);
  };

  const claimer = state.lastPlay
    ? state.players.find((p) => p.id === state.lastPlay!.playerId)
    : null;
  const claimRank = state.lastPlay?.claimedRank ?? state.requiredRank ?? null;
  const claimCount = state.lastPlay?.actualCards.length ?? null;
  const claimerName = claimer?.name ?? null;
  const initial = (claimerName ?? '?').trim().charAt(0).toUpperCase();

  return (
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
          state={tableState}
          localPlayerId={userId}
          hideBottomSeat
          faceDownPlays={!revealFaceUp}
          slamStyle="bluff"
          visiblePlays={dealing ? [] : visiblePlays}
          collectTo={collectTo}
          onCollectDone={() => {
            setCollectTo(null);
            setHeldPlays(null);
            setRevealFaceUp(false);
            void refresh();
          }}
          turnSeconds={secondsLeft}
          turnProgress={turnProgress}
          turnDurationSec={Math.round(GAME_TIMING.turnTimeoutMs / 1000)}
        />
        {dealing ? (
          <DealAnimation
            playerCount={state.players.length}
            cardsPerPlayer={cardsPerPlayer}
            onComplete={() => setDealing(false)}
          />
        ) : null}
      </View>

      {!dealing ? (
        <View
          style={[
            styles.claimHud,
            { left: room.gutter + room.edge + 4, top: '36%' },
          ]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.claimOrb,
              canCall && styles.claimOrbAlert,
              !claimRank && styles.claimOrbIdle,
            ]}
          >
            <Text style={styles.claimOrbLabel}>
              {state.lastPlay ? 'CLAIM' : claimRank ? 'THROW' : 'LEAD'}
            </Text>
            <Text
              style={[styles.claimOrbRank, !claimRank && styles.claimOrbRankIdle]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {claimRank ?? '—'}
            </Text>
            {claimCount != null ? (
              <View style={styles.claimCountBadge}>
                <Text style={styles.claimCountText}>{`×${claimCount}`}</Text>
              </View>
            ) : null}
            {claimerName ? (
              <View style={styles.claimerChip}>
                <View style={styles.claimerAvatar}>
                  <Text style={styles.claimerInitial}>{initial}</Text>
                </View>
                <Text style={styles.claimerName} numberOfLines={1}>
                  {claimerName}
                </Text>
              </View>
            ) : (
              <Text style={styles.claimerIdle}>
                {isMyTurn ? 'Your move' : 'Waiting…'}
              </Text>
            )}
          </View>
          <View style={styles.claimFoot}>
            <Text style={styles.pileFoot}>{`Pile ${state.pile.length}`}</Text>
            {canCall ? <Text style={styles.callFoot}>Call bluff?</Text> : null}
          </View>
          {statusFlash ? (
            <Text style={styles.flash} numberOfLines={2}>
              {statusFlash}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!dealing && me && me.finishOrder == null ? (
        <View
          style={[
            styles.handDock,
            {
              left: room.gutter + room.edge,
              right: room.control + room.edge * 3 + (isMyTurn ? 8 : 0),
              bottom: room.handBottom + (isMyTurn ? 50 : 0),
            },
          ]}
        >
          <PlayerHand
            hand={me.hand}
            leadSuit={null}
            selectedId={selectedCardIds[selectedCardIds.length - 1] ?? null}
            selectedIds={selectedCardIds}
            interactive={!!isMyTurn && !collectTo && !revealFaceUp && !submitting}
            compact={room.compactHand}
            onSelect={(c) => {
              toggleCard(c.id);
              void playSfx('card_select');
            }}
          />
        </View>
      ) : null}

      {!dealing &&
      isMyTurn &&
      me &&
      me.finishOrder == null &&
      !collectTo &&
      !revealFaceUp ? (
        <View
          style={[
            styles.actionBar,
            {
              right: Math.max(insets.right, 4) + room.edge,
              bottom: Math.max(insets.bottom, 4),
              maxWidth: Math.min(300, room.long * 0.42),
            },
          ]}
        >
          <Text style={styles.railHint} numberOfLines={1}>
            {!freeClaim
              ? `As ${state.requiredRank}`
              : throwCount > 0
                ? `${throwCount} selected`
                : 'Tap cards'}
          </Text>
          <View style={styles.actionRow}>
            {canCall ? (
              <AppButton
                title="Call"
                variant="danger"
                compact
                plain
                flex
                disabled={submitting}
                onPress={() => {
                  setSubmitting(true);
                  void submitBluffMove(gameId, { action: 'call' })
                    .then((next) => {
                      applyState(next);
                      setSelectedCardIds([]);
                    })
                    .catch((e) => {
                      Alert.alert(
                        'Call failed',
                        e instanceof Error ? e.message : 'Error'
                      );
                      void playSfx('error');
                    })
                    .finally(() => setSubmitting(false));
                }}
              />
            ) : null}
            {canPass ? (
              <AppButton
                title="Pass"
                variant="secondary"
                compact
                plain
                flex
                disabled={submitting}
                onPress={() => {
                  setSubmitting(true);
                  void submitBluffMove(gameId, { action: 'pass' })
                    .then((next) => {
                      applyState(next);
                      setSelectedCardIds([]);
                      void playSfx('pass_turn');
                    })
                    .catch((e) => {
                      setLastError(
                        e instanceof Error ? e.message : 'Pass failed'
                      );
                      void playSfx('error');
                    })
                    .finally(() => setSubmitting(false));
                }}
              />
            ) : null}
            <AppButton
              title={throwCount > 0 ? `Throw ×${throwCount}` : 'Throw'}
              compact
              plain
              flex
              disabled={!canThrow || claimSheetOpen || submitting}
              onPress={onPressThrow}
            />
          </View>
          {lastError ? <Text style={styles.err}>{lastError}</Text> : null}
        </View>
      ) : null}

      {claimSheetOpen ? (
        <View style={styles.sheetBackdrop} pointerEvents="box-none">
          <Pressable
            style={styles.sheetDim}
            onPress={() => setClaimSheetOpen(false)}
          />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{`Throw ${throwCount} as…?`}</Text>
            <View style={styles.rankGrid}>
              {RANKS.map((r) => {
                const on = sheetRank === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setSheetRank(r as Rank)}
                    style={[styles.rankCell, on && styles.rankCellOn]}
                  >
                    <Text
                      style={[styles.rankCellText, on && styles.rankCellTextOn]}
                    >
                      {r}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.sheetActions}>
              <AppButton
                title="Cancel"
                variant="ghost"
                compact
                plain
                flex
                onPress={() => setClaimSheetOpen(false)}
              />
              <AppButton
                title="Throw"
                compact
                plain
                flex
                disabled={!sheetRank || submitting}
                onPress={() => {
                  if (sheetRank) void doThrow(sheetRank);
                }}
              />
            </View>
          </View>
        </View>
      ) : null}

      {state.phase === 'game_complete' ? (
        <View style={styles.over}>
          <Text style={styles.overTitle}>
            {state.winnerId === userId ? 'You escaped!' : 'Game over'}
          </Text>
          <AppButton
            title="Leave"
            onPress={() => {
              void leaveRoom(gameId).finally(() => {
                void stopMusic();
                void lockLandscapeOrientation();
                router.replace('/online');
              });
            }}
          />
        </View>
      ) : null}

      <GameChrome
        roomCode={roomCode || 'BLUFF'}
        statusLine={
          dealing
            ? 'DEALING…'
            : collectTo || revealFaceUp
              ? 'COLLECTING…'
              : claimSheetOpen
                ? 'CLAIM RANK…'
                : isMyTurn
                  ? canCall
                    ? 'CALL · PASS · THROW'
                    : canPass
                      ? 'PASS OR THROW'
                      : 'YOUR TURN · THROW'
                  : 'Waiting…'
        }
        yourTurn={!!isMyTurn && !dealing && !collectTo && !revealFaceUp}
        onExit={() => {
          void leaveRoom(gameId).finally(() => {
            void stopMusic();
            void lockLandscapeOrientation();
            router.replace('/online');
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tableWrap: {
    ...StyleSheet.absoluteFill,
    zIndex: GAME_THEME.layers.playingTable,
  },
  claimHud: {
    position: 'absolute',
    zIndex: 28,
    alignItems: 'center',
    width: 120,
    gap: 6,
  },
  claimOrb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: ART_DECO_PALETTE.gold,
    backgroundColor: 'rgba(4, 20, 18, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimOrbAlert: { borderColor: '#E87868' },
  claimOrbIdle: { borderColor: 'rgba(214,175,85,0.45)' },
  claimOrbLabel: {
    color: 'rgba(214,175,85,0.7)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  claimOrbRank: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
  },
  claimOrbRankIdle: { color: 'rgba(247,241,227,0.35)', fontSize: 28 },
  claimCountBadge: {
    position: 'absolute',
    right: -6,
    top: 6,
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 6,
    backgroundColor: ART_DECO_PALETTE.gold,
    borderWidth: 2,
    borderColor: ART_DECO_PALETTE.emeraldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimCountText: {
    color: ART_DECO_PALETTE.emeraldDark,
    fontWeight: '900',
    fontSize: 12,
  },
  claimerChip: {
    position: 'absolute',
    bottom: -14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(8,14,14,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.55)',
  },
  claimerAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(214,175,85,0.25)',
    borderWidth: 1,
    borderColor: ART_DECO_PALETTE.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimerInitial: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 10,
    fontWeight: '900',
  },
  claimerName: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 1,
  },
  claimerIdle: {
    position: 'absolute',
    bottom: -12,
    color: 'rgba(247,241,227,0.55)',
    fontSize: 10,
    fontWeight: '700',
  },
  claimFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  pileFoot: {
    color: 'rgba(247,241,227,0.7)',
    fontSize: 11,
    fontWeight: '700',
  },
  callFoot: { color: '#FFB4A8', fontSize: 11, fontWeight: '800' },
  flash: {
    color: ART_DECO_PALETTE.gold,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 220,
  },
  handDock: {
    position: 'absolute',
    zIndex: GAME_THEME.layers.playerHand,
    alignItems: 'center',
  },
  actionBar: {
    position: 'absolute',
    zIndex: 50,
    alignItems: 'stretch',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.4)',
    backgroundColor: 'rgba(6,12,12,0.92)',
    minWidth: 168,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  railHint: {
    color: 'rgba(247,241,227,0.55)',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 80,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheetDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: ART_DECO_PALETTE.gold,
    backgroundColor: 'rgba(8,14,14,0.96)',
    padding: 16,
    gap: 10,
    zIndex: 1,
  },
  sheetTitle: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  rankCell: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(214,175,85,0.35)',
    backgroundColor: 'rgba(8,11,11,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankCellOn: {
    borderColor: ART_DECO_PALETTE.goldLight,
    backgroundColor: 'rgba(214,175,85,0.32)',
  },
  rankCellText: {
    color: 'rgba(247,241,227,0.75)',
    fontWeight: '700',
    fontSize: 14,
  },
  rankCellTextOn: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '900',
  },
  err: { color: '#FF8A7A', textAlign: 'center', fontSize: 10 },
  over: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 32,
    zIndex: 60,
  },
  overTitle: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
});
