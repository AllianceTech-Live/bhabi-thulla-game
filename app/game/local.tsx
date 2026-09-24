import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DealAnimation } from '@/src/components/game/DealAnimation';
import { GameChrome } from '@/src/components/game/GameChrome';
import { GameTable } from '@/src/components/game/GameTable';
import { PlayerHand } from '@/src/components/game/PlayerHand';
import { EscapeCelebration } from '@/src/components/game/EscapeCelebration';
import { AppButton } from '@/src/components/ui/AppButton';
import { GameBackground } from '@/src/components/table';
import { GAME_ASSETS, ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { cachedAssetSource } from '@/src/services/preloadAssets';
import { GAME_THEME } from '@/src/constants/gameTheme';
import { GAME_TIMING } from '@/src/constants/timing';
import { chooseCard } from '@/src/game/ai/chooseCard';
import { getSeatOriginForPlayer } from '@/src/game/seatOrigin';
import { useEscapeCelebration } from '@/src/hooks/useEscapeCelebration';
import { useGameSfx } from '@/src/hooks/useGameSfx';
import { useRoomLayout } from '@/src/hooks/useRoomLayout';
import { useTableMusic } from '@/src/hooks/useTableMusic';
import { useTurnTimer } from '@/src/hooks/useTurnTimer';
import { playSfx, stopMusic } from '@/src/services/audio';
import { lockLandscapeOrientation } from '@/src/services/orientation';
import { triggerHaptic } from '@/src/services/haptics';
import { useGameStore } from '@/src/store/gameStore';
import { useStatsStore } from '@/src/store/statsStore';

export default function LocalGameScreen() {
  const insets = useSafeAreaInsets();
  const room = useRoomLayout();
  const state = useGameStore((s) => s.state);
  const playLocalCard = useGameStore((s) => s.playLocalCard);
  const revealLocalHand = useGameStore((s) => s.revealLocalHand);
  const runAiTurnIfNeeded = useGameStore((s) => s.runAiTurnIfNeeded);
  const lastError = useGameStore((s) => s.lastError);
  const clearError = useGameStore((s) => s.clearError);
  const thullaCount = useGameStore((s) => s.thullaCountThisGame);
  const localHumanIds = useGameStore((s) => s.localHumanIds);
  const clearGame = useGameStore((s) => s.clearGame);
  const thullaMoment = useGameStore((s) => s.thullaMoment);
  const clearThullaMoment = useGameStore((s) => s.clearThullaMoment);
  const heldTrickPlays = useGameStore((s) => s.heldTrickPlays);
  const clearHeldTrick = useGameStore((s) => s.clearHeldTrick);
  const recordGameEnd = useStatsStore((s) => s.recordGameEnd);

  const [dealing, setDealing] = useState(true);
  const [playLocked, setPlayLocked] = useState(false);
  const [autoOn, setAutoOn] = useState(false);
  const skipNextAutoPlay = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thullaCollectReady, setThullaCollectReady] = useState(false);
  const recordedRef = useRef(false);
  const dealShownForGame = useRef<string | null>(null);
  const thullaFxShown = useRef<string | null>(null);
  const { name: escapedName, dismiss: dismissEscape, holdResults } =
    useEscapeCelebration(state, localHumanIds, !!thullaMoment);

  useEffect(() => {
    if (!state) {
      router.replace('/');
      return;
    }
    if (dealShownForGame.current !== state.id) {
      dealShownForGame.current = state.id;
      setDealing(true);
    }
  }, [state]);

  useEffect(() => {
    if (!thullaMoment) {
      setThullaCollectReady(false);
      return;
    }
    setThullaCollectReady(false);
    const t = setTimeout(
      () => setThullaCollectReady(true),
      GAME_TIMING.thullaSlamMs
    );
    return () => clearTimeout(t);
  }, [thullaMoment]);

  useEffect(() => {
    if (!thullaMoment) return;
    const key = `${thullaMoment.thullaPlayerId}-${thullaMoment.thullaCard.id}-${thullaMoment.plays.length}`;
    if (thullaFxShown.current === key) return;
    thullaFxShown.current = key;
    void triggerHaptic('medium');
  }, [thullaMoment]);

  useEffect(() => {
    if (!thullaMoment || !thullaCollectReady) return;
    void playSfx('shuffle');
  }, [thullaMoment, thullaCollectReady]);

  useEffect(() => {
    if (
      !state ||
      state.phase === 'game_complete' ||
      dealing ||
      playLocked ||
      thullaMoment ||
      (heldTrickPlays != null &&
        heldTrickPlays.length > 0 &&
        state.trick.plays.length === 0)
    ) {
      return;
    }
    const current = state.players.find(
      (p) => p.id === state.currentTurnPlayerId
    );
    if (current?.type === 'ai') {
      const t = setTimeout(
        () => runAiTurnIfNeeded(),
        GAME_TIMING.aiThinkMs
      );
      return () => clearTimeout(t);
    }
  }, [
    state,
    runAiTurnIfNeeded,
    dealing,
    playLocked,
    thullaMoment,
    heldTrickPlays,
  ]);

  // Keep completed trick (up to 4 cards) visible in center briefly
  useEffect(() => {
    if (
      !heldTrickPlays ||
      heldTrickPlays.length === 0 ||
      thullaMoment ||
      (state?.trick.plays.length ?? 0) > 0
    ) {
      return;
    }
    const t = setTimeout(() => {
      clearHeldTrick();
      setPlayLocked(false);
    }, GAME_TIMING.trickResolveMs);
    return () => clearTimeout(t);
  }, [heldTrickPlays, thullaMoment, state?.trick.plays.length, clearHeldTrick]);

  useEffect(() => {
    if (lastError) {
      void playSfx('error');
      Alert.alert('Invalid move', lastError, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [lastError, clearError]);

  useEffect(() => {
    if (state?.phase !== 'game_complete' || recordedRef.current || dealing) {
      return;
    }
    // Wait for Thulla animation to finish if one is showing
    if (thullaMoment) return;
    if (holdResults.current || escapedName) return;

    recordedRef.current = true;
    clearHeldTrick();
    setPlayLocked(false);
    const human = state.players.find((p) => localHumanIds.includes(p.id));
    void stopMusic();
    if (human?.status === 'escaped') {
      void playSfx('win');
    } else if (human?.status === 'bhabhi') {
      void playSfx('error');
    }
    recordGameEnd({
      escaped: human?.status === 'escaped',
      wasBhabhi: human?.status === 'bhabhi',
      thullas: thullaCount,
      offline: true,
    });
    void triggerHaptic(human?.status === 'bhabhi' ? 'warning' : 'success');
    const t = setTimeout(() => router.replace('/game/results'), 900);
    return () => clearTimeout(t);
  }, [
    state,
    localHumanIds,
    recordGameEnd,
    thullaCount,
    dealing,
    thullaMoment,
    clearHeldTrick,
    escapedName,
  ]);

  // Safety: if game ended during thulla but overlay never finished, force clear
  useEffect(() => {
    if (state?.phase !== 'game_complete' || !thullaMoment) return;
    const t = setTimeout(() => {
      clearThullaMoment();
      setPlayLocked(false);
    }, GAME_TIMING.thullaHoldMs + 400);
    return () => clearTimeout(t);
  }, [state?.phase, thullaMoment, clearThullaMoment]);

  const onThullaDone = useCallback(() => {
    clearThullaMoment();
    setPlayLocked(false);
  }, [clearThullaMoment]);

  const currentPlayer = useMemo(() => {
    if (!state?.currentTurnPlayerId) return null;
    return state.players.find((p) => p.id === state.currentTurnPlayerId) ?? null;
  }, [state]);

  const isPassPlay = state?.mode === 'offline_pass_play';
  const isHumanTurn = currentPlayer?.type === 'human';
  const gameOver = state?.phase === 'game_complete';

  useTableMusic(Boolean(state) && !dealing && !gameOver);

  /** Always the seated local human for AI mode; current human for pass-play */
  const dockPlayerId =
    isPassPlay && currentPlayer?.type === 'human'
      ? currentPlayer.id
      : (localHumanIds[0] ?? null);

  const dockPlayer =
    state?.players.find((p) => p.id === dockPlayerId) ??
    state?.players.find((p) => p.type === 'human') ??
    state?.players[0] ??
    null;

  const handRevealed =
    !isPassPlay || (isHumanTurn && state?.handRevealed === true);

  const canInteract =
    !gameOver &&
    !dealing &&
    !thullaMoment &&
    isHumanTurn &&
    handRevealed &&
    !playLocked &&
    currentPlayer?.id === dockPlayerId &&
    !(
      heldTrickPlays != null &&
      heldTrickPlays.length > 0 &&
      (state?.trick.plays.length ?? 0) === 0
    );

  useEffect(() => {
    if (!canInteract) setSelectedId(null);
  }, [canInteract]);

  const visibleCount =
    thullaMoment?.plays.length ??
    heldTrickPlays?.length ??
    state?.trick.plays.length ??
    0;
  useGameSfx(state, visibleCount, dealing || !state);

  const onTurnTimeout = useCallback(() => {
    skipNextAutoPlay.current = true;
    setAutoOn(true);
    void triggerHaptic('warning');
    void playSfx('pass_turn');
    const store = useGameStore.getState();
    const st = store.state;
    const pid = st?.currentTurnPlayerId;
    if (!st || !pid) return;
    const player = st.players.find((p) => p.id === pid);
    if (!player || player.type !== 'human') return;
    try {
      const card = chooseCard({
        state: st,
        playerId: pid,
        difficulty: 'medium',
      });
      setPlayLocked(true);
      const ok = store.playLocalCard(pid, card.id);
      if (!ok) {
        setPlayLocked(false);
        return;
      }
      const after = useGameStore.getState();
      if (
        after.thullaMoment != null ||
        (after.heldTrickPlays &&
          after.heldTrickPlays.length > 0 &&
          after.state?.trick.plays.length === 0)
      ) {
        return;
      }
      setTimeout(() => setPlayLocked(false), GAME_TIMING.afterPlayMs);
    } catch {
      setPlayLocked(false);
    }
  }, []);

  const turnKey =
    state &&
    !dealing &&
    !gameOver &&
    state.phase !== 'game_complete' &&
    state.currentTurnPlayerId
      ? `${state.currentTurnPlayerId}:${state.trick.plays.length}:${state.events.length}`
      : null;

  const { secondsLeft, progress: turnProgress } = useTurnTimer({
    turnKey,
    durationMs: GAME_TIMING.turnTimeoutMs,
    enableTimeout: Boolean(canInteract && !autoOn),
    onTimeout: onTurnTimeout,
  });

  useEffect(() => {
    if (!autoOn || !canInteract || !state || !currentPlayer) return;
    if (skipNextAutoPlay.current) {
      skipNextAutoPlay.current = false;
      return;
    }
    const t = setTimeout(() => {
      try {
        const card = chooseCard({
          state,
          playerId: currentPlayer.id,
          difficulty: 'medium',
        });
        setPlayLocked(true);
        const ok = playLocalCard(currentPlayer.id, card.id);
        if (!ok) {
          setPlayLocked(false);
          return;
        }
        void triggerHaptic('light');
        const store = useGameStore.getState();
        if (
          store.thullaMoment != null ||
          (store.heldTrickPlays &&
            store.heldTrickPlays.length > 0 &&
            store.state?.trick.plays.length === 0)
        ) {
          return;
        }
        setTimeout(() => setPlayLocked(false), GAME_TIMING.afterPlayMs);
      } catch {
        setPlayLocked(false);
      }
    }, GAME_TIMING.aiThinkMs);
    return () => clearTimeout(t);
  }, [autoOn, canInteract, state, currentPlayer, playLocalCard]);

  if (!state || !dockPlayer) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const cardsPerPlayer = Math.ceil(52 / state.players.length);
  const statusLine = gameOver
    ? 'Round over…'
    : dealing
      ? 'Dealing…'
      : thullaMoment
        ? 'Thulla!'
        : isHumanTurn && currentPlayer?.id === dockPlayerId
          ? 'YOUR TURN'
          : currentPlayer
            ? `${currentPlayer.name}'s turn`
            : 'Waiting…';

  const yourTurn = canInteract;

  const onPlayCard = async (cardId: string) => {
    if (!canInteract || !currentPlayer || playLocked) return;
    setPlayLocked(true);
    const ok = playLocalCard(currentPlayer.id, cardId);
    if (ok) {
      const store = useGameStore.getState();
      if (store.thullaMoment != null) {
        await triggerHaptic('light');
        return;
      }
      await triggerHaptic('light');
      // If trick completed, unlock happens when held cards clear
      if (
        store.heldTrickPlays &&
        store.heldTrickPlays.length > 0 &&
        store.state?.trick.plays.length === 0
      ) {
        return;
      }
      setTimeout(() => setPlayLocked(false), GAME_TIMING.afterPlayMs);
    } else {
      setPlayLocked(false);
    }
  };

  return (
    <GameBackground>
      <View
        style={[
          styles.root,
          {
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingBottom: Math.max(insets.bottom, 4),
          },
        ]}
      >
        <View style={styles.tableWrap}>
          <GameTable
            state={state}
            localPlayerId={dockPlayerId}
            hideBottomSeat
            visiblePlays={
              thullaMoment?.plays ?? heldTrickPlays ?? state.trick.plays
            }
            collectTo={
              thullaMoment && thullaCollectReady
                ? getSeatOriginForPlayer(
                    state,
                    dockPlayerId,
                    thullaMoment.collectorId
                  )
                : null
            }
            onCollectDone={onThullaDone}
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

        {/* Hand stays hidden while the deal plays */}
        {!dealing ? (
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
          {isPassPlay && isHumanTurn && !state.handRevealed ? (
            <View style={styles.passReady}>
              <Text style={styles.passReadyText}>
                Pass to {currentPlayer?.name ?? 'next player'} — tap when ready
              </Text>
              <AppButton
                title="Show my cards"
                onPress={revealLocalHand}
                compact
                style={styles.readyBtn}
              />
            </View>
          ) : (
            <View style={styles.handColumn}>
              <PlayerHand
                hand={dockPlayer.hand}
                leadSuit={state.trick.leadSuit}
                selectedId={selectedId}
                interactive={canInteract}
                hidden={!handRevealed && isPassPlay}
                compact={room.compactHand}
                onSelect={(c) => {
                  if (selectedId === c.id) {
                    void onPlayCard(c.id);
                  } else {
                    setSelectedId(c.id);
                    void playSfx('card_select');
                  }
                }}
              />
            </View>
          )}
        </View>
        ) : null}

        {!dealing ? (
        <View
          style={[styles.youTag, { left: room.edge, bottom: room.youBottom }]}
          pointerEvents="none"
        >
                <Image
                  source={cachedAssetSource(GAME_ASSETS.playerFrame)}
                  style={styles.youFrame}
                  resizeMode="contain"
                  fadeDuration={0}
                />
                <Text style={styles.youLabel}>{dockPlayer.name}</Text>
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>{dockPlayer.hand.length}</Text>
                </View>
        </View>
        ) : null}

        <GameChrome
          roomCode={state.mode === 'online' ? state.id.slice(0, 4).toUpperCase() : 'LOCAL'}
          offline={state.mode !== 'online'}
          statusLine={statusLine}
          yourTurn={yourTurn}
          onExit={() =>
            Alert.alert('Leave game?', 'Progress will be lost.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Leave',
                style: 'destructive',
                onPress: () => {
                  clearGame();
                  void stopMusic();
                  void lockLandscapeOrientation();
                  router.replace('/');
                  setTimeout(() => void lockLandscapeOrientation(), 80);
                },
              },
            ])
          }
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
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  muted: {
    color: 'rgba(247,241,227,0.45)',
    textAlign: 'center',
    marginTop: 40,
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
  handColumn: {
    alignItems: 'center',
    width: '100%',
  },
  youTag: {
    position: 'absolute',
    zIndex: GAME_THEME.layers.gameControls,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11,11,11,0.88)',
    borderWidth: 1.5,
    borderColor: ART_DECO_PALETTE.gold,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 8,
  },
  youFrame: {
    width: 28,
    height: 28,
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
  passReady: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
    backgroundColor: 'rgba(11,11,11,0.85)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ART_DECO_PALETTE.gold,
  },
  passReadyText: {
    flex: 1,
    color: GAME_THEME.colors.ivory,
    fontSize: 13,
    fontWeight: '600',
  },
  readyBtn: {
    marginVertical: 0,
  },
});
