import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameChrome } from '@/src/components/game/GameChrome';
import { GameTable } from '@/src/components/game/GameTable';
import { DealAnimation } from '@/src/components/game/DealAnimation';
import type { SeatOrigin } from '@/src/components/game/TrickPlayCard';
import { PlayerHand } from '@/src/components/game/PlayerHand';
import { AppButton } from '@/src/components/ui/AppButton';
import { GameBackground } from '@/src/components/table';
import { ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { GAME_THEME } from '@/src/constants/gameTheme';
import { GAME_TIMING } from '@/src/constants/timing';
import type { BluffState } from '@/src/game/bluff';
import type { Card, GameState, Rank, TrickPlay } from '@/src/game/types';
import { RANKS } from '@/src/game/types';
import { useRoomLayout } from '@/src/hooks/useRoomLayout';
import { useTableMusic } from '@/src/hooks/useTableMusic';
import { useTurnTimer } from '@/src/hooks/useTurnTimer';
import { playSfx, stopMusic } from '@/src/services/audio';
import { lockLandscapeOrientation } from '@/src/services/orientation';
import { triggerHaptic } from '@/src/services/haptics';
import { useBluffStore } from '@/src/store/bluffStore';
function seatOriginForPlayer(
  bluff: BluffState,
  localId: string | null,
  playerId: string
): SeatOrigin {
  const ordered = [...bluff.players].sort((a, b) => a.seat - b.seat);
  const local =
    ordered.find((p) => p.id === localId) ?? ordered[0]!;
  const localIndex = ordered.findIndex((p) => p.id === local.id);
  const idx = ordered.findIndex((p) => p.id === playerId);
  if (idx < 0 || localIndex < 0) return 'bottom';
  const offset = (idx - localIndex + ordered.length) % ordered.length;
  return (['bottom', 'left', 'top', 'right'] as const)[offset] ?? 'bottom';
}

/** Map Bluff → GameTable: last claim flies face-down onto the felt. */
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
    mode: 'offline_ai',
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

export default function BluffLocalScreen() {
  const insets = useSafeAreaInsets();
  const room = useRoomLayout();
  const state = useBluffStore((s) => s.state);
  const localHumanIds = useBluffStore((s) => s.localHumanIds);
  const selectedCardIds = useBluffStore((s) => s.selectedCardIds);
  const lastError = useBluffStore((s) => s.lastError);
  const toggleCard = useBluffStore((s) => s.toggleCard);
  const setClaimRank = useBluffStore((s) => s.setClaimRank);
  const playSelected = useBluffStore((s) => s.playSelected);
  const call = useBluffStore((s) => s.call);
  const pass = useBluffStore((s) => s.pass);
  const runAiIfNeeded = useBluffStore((s) => s.runAiIfNeeded);
  const autoPlayCurrentTurn = useBluffStore((s) => s.autoPlayCurrentTurn);
  const clear = useBluffStore((s) => s.clear);

  const [statusFlash, setStatusFlash] = useState('');
  const [collectTo, setCollectTo] = useState<SeatOrigin | null>(null);
  const [heldPlays, setHeldPlays] = useState<TrickPlay[] | null>(null);
  const [revealFaceUp, setRevealFaceUp] = useState(false);
  const [claimSheetOpen, setClaimSheetOpen] = useState(false);
  const [sheetRank, setSheetRank] = useState<Rank | null>(null);
  const [dealing, setDealing] = useState(true);
  const eventsLen = useRef(0);
  const dealShownForGame = useRef<string | null>(null);

  const meId = localHumanIds[0] ?? null;
  const isMyTurn = state?.currentTurnPlayerId === meId;
  const me = state?.players.find((p) => p.id === meId);
  const canInteract =
    Boolean(
      state &&
        !dealing &&
        isMyTurn &&
        me &&
        me.finishOrder == null &&
        !collectTo &&
        !revealFaceUp &&
        state.phase === 'playing'
    );

  const onTurnTimeout = useCallback(() => {
    setClaimSheetOpen(false);
    setSheetRank(null);
    void triggerHaptic('warning');
    void playSfx('pass_turn');
    autoPlayCurrentTurn();
  }, [autoPlayCurrentTurn]);

  const turnKey =
    state &&
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

  useEffect(() => {
    if (!state) return;
    if (dealShownForGame.current !== state.id) {
      dealShownForGame.current = state.id;
      setDealing(true);
      eventsLen.current = state.events.length;
    }
  }, [state]);

  useTableMusic(
    Boolean(state) && !dealing && state?.phase !== 'game_complete'
  );
  // Auto-claim rank when the table requires one (next player must match).
  useEffect(() => {
    if (!state?.requiredRank || !isMyTurn) return;
    setClaimRank(state.requiredRank);
  }, [state?.requiredRank, isMyTurn, setClaimRank]);

  useEffect(() => {
    if (!state || state.phase !== 'playing' || dealing || collectTo || revealFaceUp)
      return;
    const t = setTimeout(() => runAiIfNeeded(), GAME_TIMING.aiThinkMs + 200);
    return () => clearTimeout(t);
  }, [state, runAiIfNeeded, dealing, collectTo, revealFaceUp]);

  useEffect(() => {
    if (!state || dealing) return;
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
          void triggerHaptic('light');
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
          const pileCount = Number(
            last.payload?.pileCount ?? Math.max(1, raw.length)
          );

          setStatusFlash(
            honest
              ? 'Truth! Caller takes the pile'
              : 'Bluff! Liar takes the pile'
          );
          // Voice + badge come from slamStyle="bluff" on reveal; only cue wrong-call here
          if (honest) {
            void playSfx('error');
          }
          void triggerHaptic('warning');

          const snapshot: TrickPlay[] =
            raw.length > 0
              ? raw.map((c) => ({
                  playerId: liarId || meId || 'x',
                  card: {
                    id: c.id,
                    suit: c.suit as TrickPlay['card']['suit'],
                    rank: c.rank as Rank,
                  },
                  isThulla: !honest,
                }))
              : Array.from(
                  { length: Math.min(4, Math.max(1, pileCount)) },
                  (_, i) => ({
                    playerId: liarId || meId || 'x',
                    card: {
                      id: `collect-${Date.now()}-${i}`,
                      suit: 'spades' as const,
                      rank: claimedRank,
                    },
                    isThulla: !honest,
                  })
                );

          // Reveal face-up first (like Thulla), then slide pile to taker
          setHeldPlays(snapshot);
          setRevealFaceUp(true);
          timers.push(
            setTimeout(() => {
              setCollectTo(seatOriginForPlayer(state, meId, takerId));
            }, GAME_TIMING.thullaSlamMs)
          );
        }
      }, 0)
    );
    return () => {
      for (const id of timers) clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drive from events length
  }, [state?.events.length]);

  const tableState = useMemo(
    () => (state ? toTableState(state) : null),
    [state]
  );

  const visiblePlays = heldPlays ?? tableState?.trick.plays ?? null;

  if (!state || !tableState) {
    return (
      <GameBackground>
        <View style={styles.center}>
          <Text style={styles.muted}>No Bluff game</Text>
          <AppButton title="Home" onPress={() => router.replace('/')} />
        </View>
      </GameBackground>
    );
  }

  const freeClaim = !state.requiredRank;
  const canCall =
    Boolean(
      !dealing &&
        isMyTurn &&
        me &&
        state.lastPlay &&
        state.lastPlay.playerId !== meId
    );
  const canPass = Boolean(!dealing && isMyTurn && me && state.lastPlay);
  const throwCount = selectedCardIds.length;
  const canThrow = throwCount >= 1 && throwCount <= 4;
  const cardsPerPlayer = Math.ceil(52 / state.players.length);

  const rankOfFirstSelected = (): Rank | null => {
    if (!me || selectedCardIds.length === 0) return null;
    const card = me.hand.find((c: Card) => c.id === selectedCardIds[0]);
    return card?.rank ?? null;
  };

  const doThrow = (rank: Rank) => {
    try {
      if (!meId || !rank) {
        void playSfx('error');
        return;
      }
      const ok = playSelected(meId, rank);
      setClaimSheetOpen(false);
      setSheetRank(null);
      if (ok) {
        void playSfx('card_throw');
        void triggerHaptic('light');
      } else {
        void playSfx('error');
      }
    } catch {
      setClaimSheetOpen(false);
      void playSfx('error');
    }
  };

  const onPressThrow = () => {
    if (!canThrow || !meId) {
      void playSfx('error');
      return;
    }
    if (state.requiredRank) {
      doThrow(state.requiredRank);
      return;
    }
    // Lead: ask what you're claiming
    setSheetRank(rankOfFirstSelected());
    setClaimSheetOpen(true);
  };

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
            state={tableState}
            localPlayerId={meId}
            hideBottomSeat
            faceDownPlays={!revealFaceUp}
            slamStyle="bluff"
            visiblePlays={dealing ? [] : visiblePlays}
            collectTo={collectTo}
            onCollectDone={() => {
              setCollectTo(null);
              setHeldPlays(null);
              setRevealFaceUp(false);
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
          (() => {
          const claimer = state.lastPlay
            ? state.players.find((p) => p.id === state.lastPlay!.playerId)
            : null;
          const claimRank =
            state.lastPlay?.claimedRank ?? state.requiredRank ?? null;
          const claimCount = state.lastPlay?.actualCards.length ?? null;
          const claimerName = claimer?.name ?? null;
          const initial = (claimerName ?? '?').trim().charAt(0).toUpperCase();

          return (
            <View
              style={[
                styles.claimHud,
                {
                  left: room.gutter + room.edge + 4,
                  top: '36%',
                },
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
                  {state.lastPlay
                    ? 'CLAIM'
                    : claimRank
                      ? 'THROW'
                      : 'LEAD'}
                </Text>
                <Text
                  style={[
                    styles.claimOrbRank,
                    !claimRank && styles.claimOrbRankIdle,
                  ]}
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
                {canCall ? (
                  <Text style={styles.callFoot}>Call bluff?</Text>
                ) : null}
              </View>
              {statusFlash ? (
                <Text style={styles.flash} numberOfLines={2}>
                  {statusFlash}
                </Text>
              ) : null}
            </View>
          );
        })()
        ) : null}

        {!dealing && me && me.finishOrder == null && (
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
              interactive={
                !!isMyTurn && !collectTo && !revealFaceUp && !claimSheetOpen
              }
              compact={room.compactHand}
              onSelect={(c) => {
                toggleCard(c.id);
                void playSfx('card_select');
              }}
            />
          </View>
        )}

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
                  onPress={() => {
                    call(meId!);
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
                  onPress={() => {
                    if (pass(meId!)) {
                      void playSfx('click');
                      void triggerHaptic('light');
                    } else {
                      void playSfx('error');
                    }
                  }}
                />
              ) : null}
              <AppButton
                title={throwCount > 0 ? `Throw ×${throwCount}` : 'Throw'}
                compact
                plain
                flex
                disabled={!canThrow || claimSheetOpen}
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
              <Text style={styles.sheetTitle}>Throw {throwCount} as…?</Text>
              <Text style={styles.sheetSub}>Pick the rank you claim</Text>
              <View style={styles.rankGrid}>
                {RANKS.map((r) => {
                  const on = sheetRank === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => {
                        setSheetRank(r as Rank);
                        void playSfx('card_select');
                      }}
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
                  disabled={!sheetRank}
                  onPress={() => {
                    if (sheetRank) doThrow(sheetRank);
                  }}
                />
              </View>
            </View>
          </View>
        ) : null}

        {state.phase === 'game_complete' ? (
          <View style={styles.over}>
            <Text style={styles.overTitle}>
              {state.winnerId === meId ? 'You escaped!' : 'Game over'}
            </Text>
            <AppButton
              title="Home"
              onPress={() => {
                clear();
                void stopMusic();
                router.replace('/');
              }}
            />
          </View>
        ) : null}

        <GameChrome
          roomCode="BLUFF"
          offline
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
            clear();
            void stopMusic();
            void lockLandscapeOrientation();
            router.replace('/');
          }}
        />
      </View>
    </GameBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  muted: {
    color: 'rgba(247,241,227,0.5)',
    textAlign: 'center',
    marginBottom: 12,
  },
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
    shadowColor: '#000',
    shadowOpacity: 0.65,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  claimOrbAlert: {
    borderColor: '#E87868',
    shadowColor: '#E87868',
    shadowOpacity: 0.45,
  },
  claimOrbIdle: {
    borderColor: 'rgba(214,175,85,0.45)',
    opacity: 0.95,
  },
  claimOrbInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  claimOrbLabel: {
    color: 'rgba(214,175,85,0.7)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: -2,
  },
  claimOrbRank: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    minWidth: 48,
  },
  claimOrbRankIdle: {
    color: 'rgba(247,241,227,0.35)',
    fontSize: 28,
  },
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
  callFoot: {
    color: '#FFB4A8',
    fontSize: 11,
    fontWeight: '800',
  },
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
  sheetSub: {
    color: 'rgba(247,241,227,0.6)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: -4,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
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
