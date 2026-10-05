import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTableChromeInsets } from '@/src/hooks/useTableChromeInsets';
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
import { TurnBanner } from '@/src/components/game/TurnBanner';
import { pickAutoPlayCardId } from '@/src/game/pickAutoPlayCard';
import { getThullaCollectTarget } from '@/src/game/seatOrigin';
import type { CollectTarget } from '@/src/game/seatOrigin';
import { useEscapeCelebration } from '@/src/hooks/useEscapeCelebration';
import { useGameSfx } from '@/src/hooks/useGameSfx';
import { useRoomLayout } from '@/src/hooks/useRoomLayout';
import { useTableMusic } from '@/src/hooks/useTableMusic';
import { useAutoPlayTurn } from '@/src/hooks/useAutoPlayTurn';
import { useTurnTimer } from '@/src/hooks/useTurnTimer';
import { playSfx, stopMusic } from '@/src/services/audio';
import { showAlert } from '@/src/services/dialogs';
import { confirmQuitGame, navigateAfterQuit } from '@/src/services/quitGame';
import { triggerHaptic } from '@/src/services/haptics';
import { useGameStore } from '@/src/store/gameStore';
import { useStatsStore } from '@/src/store/statsStore';

export default function LocalGameScreen() {
  const insets = useTableChromeInsets();
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
  const [autoPlay, setAutoPlay] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingPlayCardId, setPendingPlayCardId] = useState<string | null>(
    null
  );
  const [thullaCollectReady, setThullaCollectReady] = useState(false);
  const [deckCollectReady, setDeckCollectReady] = useState(false);
  const recordedRef = useRef(false);
  const dealShownForGame = useRef<string | null>(null);
  const thullaFxShown = useRef<string | null>(null);
  const { name: escapedName, dismiss: dismissEscape, holdResults } =
    useEscapeCelebration(state, localHumanIds, !!thullaMoment);

  useEffect(() => {
    // Do not auto-exit when state clears — Quit handles navigation.
    // Auto-replace('/') here races cleanup and can close the Android app.
    if (!state) return;
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
    const key = `${thullaMoment.thullaPlayerId}-${thullaMoment.thullaCard.id}-${thullaMoment.plays.length}-${thullaMoment.collectorId}`;
    if (thullaFxShown.current !== key) {
      thullaFxShown.current = key;
      void playSfx('thulla');
      void triggerHaptic('warning');
    }
    setThullaCollectReady(false);
    setDeckCollectReady(false);
    const t = setTimeout(
      () => setThullaCollectReady(true),
      GAME_TIMING.thullaSlamMs
    );
    return () => clearTimeout(t);
  }, [thullaMoment]);

  useEffect(() => {
    if (!thullaMoment || !thullaCollectReady) return;
    void playSfx('shuffle');
  }, [thullaMoment, thullaCollectReady]);

  // Non-Thulla completed trick → fly to bottom-right discard deck
  useEffect(() => {
    if (
      !heldTrickPlays ||
      heldTrickPlays.length === 0 ||
      thullaMoment ||
      (state?.trick.plays.length ?? 0) > 0
    ) {
      setDeckCollectReady(false);
      return;
    }
    setDeckCollectReady(false);
    const t = setTimeout(() => {
      setDeckCollectReady(true);
      void playSfx('shuffle');
    }, GAME_TIMING.trickCollectDelayMs);
    return () => clearTimeout(t);
  }, [heldTrickPlays, thullaMoment, state?.trick.plays.length]);

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

  useEffect(() => {
    if (lastError) {
      void playSfx('error');
      showAlert('Invalid move', lastError);
      clearError();
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

  const onCollectDone = useCallback(() => {
    clearThullaMoment();
    clearHeldTrick();
    setThullaCollectReady(false);
    setDeckCollectReady(false);
    setPendingPlayCardId(null);
    setPlayLocked(false);
  }, [clearThullaMoment, clearHeldTrick]);

  const currentPlayer = useMemo(() => {
    if (!state?.currentTurnPlayerId) return null;
    return state.players.find((p) => p.id === state.currentTurnPlayerId) ?? null;
  }, [state]);

  const isPassPlay = state?.mode === 'offline_pass_play';
  const isHumanTurn = currentPlayer?.type === 'human';
  const gameOver = state?.phase === 'game_complete';
  /** Pass-and-play hide is for hot-seat phones; web always shows the hand. */
  const alwaysShowHand = Platform.OS === 'web';

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

  useEffect(() => {
    if (!pendingPlayCardId || !dockPlayer) return;
    if (!dockPlayer.hand.some((c) => c.id === pendingPlayCardId)) {
      setPendingPlayCardId(null);
    }
  }, [dockPlayer, pendingPlayCardId]);

  const handRevealed =
    alwaysShowHand ||
    !isPassPlay ||
    (isHumanTurn && state?.handRevealed === true);

  const myTurnReady =
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
  const canInteract = myTurnReady && !autoPlay;

  useEffect(() => {
    if (!canInteract) setSelectedId(null);
  }, [canInteract]);

  useEffect(() => {
    if (gameOver || dealing) setAutoPlay(false);
  }, [gameOver, dealing]);

  const visibleCount =
    thullaMoment?.plays.length ??
    heldTrickPlays?.length ??
    state?.trick.plays.length ??
    0;
  useGameSfx(state, visibleCount, dealing || !state);

  const turnKey =
    state &&
    !dealing &&
    !gameOver &&
    state.phase !== 'game_complete' &&
    state.currentTurnPlayerId
      ? `${state.currentTurnPlayerId}:${state.trick.plays.length}:${state.events.length}`
      : null;

  const onPlayCard = useCallback(
    async (cardId: string) => {
      if (!myTurnReady || !currentPlayer || playLocked) return;
      if (currentPlayer.id === dockPlayerId) {
        setPendingPlayCardId(cardId);
      }
      setSelectedId(null);
      setPlayLocked(true);
      const ok = playLocalCard(currentPlayer.id, cardId);
      if (!ok) {
        setPendingPlayCardId(null);
        setPlayLocked(false);
        return;
      }
      const store = useGameStore.getState();
      if (store.thullaMoment != null) {
        await triggerHaptic('light');
        return;
      }
      await triggerHaptic('light');
      if (
        store.heldTrickPlays &&
        store.heldTrickPlays.length > 0 &&
        store.state?.trick.plays.length === 0
      ) {
        return;
      }
      setTimeout(() => setPlayLocked(false), GAME_TIMING.afterPlayMs);
    },
    [myTurnReady, currentPlayer, playLocked, dockPlayerId, playLocalCard]
  );

  const { secondsLeft, progress: turnProgress } = useTurnTimer({
    turnKey,
    durationMs: GAME_TIMING.turnTimeoutMs,
    enableTimeout: myTurnReady && !autoPlay,
    onTimeout: () => setAutoPlay(true),
  });

  useAutoPlayTurn({
    autoPlay,
    myTurnReady,
    turnKey,
    playOnce: () => {
      if (!state || !currentPlayer) return;
      const cardId = pickAutoPlayCardId(state, currentPlayer.id);
      if (cardId) void onPlayCard(cardId);
    },
  });

  if (!state || !dockPlayer) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>No game in progress</Text>
        <AppButton title="Home" onPress={() => navigateAfterQuit('/')} />
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
        : autoPlay
          ? 'AUTO PLAY ON'
          : isHumanTurn && currentPlayer?.id === dockPlayerId
            ? 'YOUR TURN'
            : currentPlayer
              ? `${currentPlayer.name}'s turn`
              : 'Waiting…';

  const yourTurn = canInteract;

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
                ? getThullaCollectTarget(
                    state,
                    dockPlayerId,
                    thullaMoment.collectorId
                  )
                : deckCollectReady
                  ? 'deck'
                  : null
            }
            onCollectDone={onCollectDone}
            turnSeconds={secondsLeft}
            turnProgress={turnProgress}
            turnDurationSec={Math.round(GAME_TIMING.turnTimeoutMs / 1000)}
            handThrowCardId={pendingPlayCardId}
          />
          {dealing ? (
            <DealAnimation
              playerCount={state.players.length}
              cardsPerPlayer={cardsPerPlayer}
              onComplete={() => setDealing(false)}
            />
          ) : null}
        </View>

        {!dealing && !gameOver && currentPlayer ? (
          <View
            style={[
              styles.turnBannerMount,
              { top: Math.max(insets.top, 8) + 36 },
            ]}
            pointerEvents="none"
          >
            <TurnBanner
              name={currentPlayer.name}
              isYou={!!yourTurn}
              secondsLeft={secondsLeft}
            />
          </View>
        ) : null}

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
          {!alwaysShowHand &&
          isPassPlay &&
          isHumanTurn &&
          !state.handRevealed ? (
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
                hand={
                  pendingPlayCardId
                    ? dockPlayer.hand.filter((c) => c.id !== pendingPlayCardId)
                    : dockPlayer.hand
                }
                leadSuit={state.trick.leadSuit}
                selectedId={selectedId}
                interactive={canInteract && !pendingPlayCardId}
                hidden={!handRevealed && isPassPlay}
                compact={room.compactHand}
                liftOnPress
                onSelect={(c) => {
                  // 1st tap: lift/select · 2nd tap on same card: throw
                  if (selectedId === c.id) {
                    void onPlayCard(c.id);
                  } else {
                    setSelectedId(c.id);
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
          autoActive={autoPlay}
          onAuto={() => setAutoPlay((on) => !on)}
          onExit={() =>
            confirmQuitGame({
              message: 'Progress on this table will be lost.',
              beforeNavigate: () => {
                clearGame();
              },
            })
          }
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
    // Above GameChrome so taps hit cards (Android blocks box-none through HUD)
    zIndex: GAME_THEME.layers.gameControls + 20,
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
  turnBannerMount: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: GAME_THEME.layers.gameControls + 5,
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
