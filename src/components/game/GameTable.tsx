import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { GameState, TrickPlay } from '../../game/types';
import { GAME_THEME } from '../../constants/gameTheme';
import { absBox, useTableBounds } from '../../hooks/useTableBounds';
import { PlayingTable } from '../table/PlayingTable';
import { CardBackView } from '../cards/CardBackView';
import { LayoutDebug } from '../game-ui/LayoutDebug';
import { PlayerSeat } from './PlayerSeat';
import { TrickPlayCard, type SeatOrigin } from './TrickPlayCard';
import { TurnSpaceTimer } from './TurnSpaceTimer';

interface GameTableProps {
  state: GameState;
  localPlayerId: string | null;
  hideBottomSeat?: boolean;
  visiblePlays?: TrickPlay[] | null;
  /** When set, trick cards slide to this seat instead of a full-screen banner. */
  collectTo?: SeatOrigin | null;
  onCollectDone?: () => void;
  /** Seconds left on the active turn clock (shown on that player's card space). */
  turnSeconds?: number | null;
  /** 1 = full time remaining */
  turnProgress?: number;
  turnDurationSec?: number;
  /** Pre-start lobby: seats show Waiting, no card fans */
  waitingRoom?: boolean;
  /** Face-down cards on table (Bluff claims) */
  faceDownPlays?: boolean;
  /** Slam badge + voice: Thulla game vs Bluff */
  slamStyle?: 'thulla' | 'bluff';
}

function seatForRelative(
  players: GameState['players'],
  localSeat: number,
  offset: number
) {
  const ordered = [...players].sort((a, b) => a.seat - b.seat);
  const localIndex = ordered.findIndex((p) => p.seat === localSeat);
  if (localIndex < 0) return ordered[0];
  return ordered[(localIndex + offset) % ordered.length];
}

function originForPlayer(
  playerId: string,
  seats: {
    bottom?: { id: string };
    top?: { id: string };
    left?: { id: string };
    right?: { id: string };
  }
): SeatOrigin {
  if (seats.bottom?.id === playerId) return 'bottom';
  if (seats.top?.id === playerId) return 'top';
  if (seats.left?.id === playerId) return 'left';
  if (seats.right?.id === playerId) return 'right';
  return 'bottom';
}

/**
 * Visual game table — Assets 1–8 composition.
 * Consumes existing GameState only; no rule changes.
 */
export function GameTable({
  state,
  localPlayerId,
  hideBottomSeat = true,
  visiblePlays,
  collectTo,
  onCollectDone,
  turnSeconds = null,
  turnProgress = 1,
  turnDurationSec = 10,
  waitingRoom = false,
  faceDownPlays = false,
  slamStyle = 'thulla',
}: GameTableProps) {
  const {
    onSceneLayout,
    scene,
    table,
    seats: anchors,
    trick,
    trickCard,
    deck,
    frameSize,
    hand,
    ready,
  } = useTableBounds();

  const local =
    state.players.find((p) => p.id === localPlayerId) ??
    state.players.find((p) => p.type === 'human') ??
    state.players[0]!;

  const bottom = local;
  const left = seatForRelative(state.players, local.seat, 1);
  const top = seatForRelative(state.players, local.seat, 2);
  const right = seatForRelative(state.players, local.seat, 3);

  const seatMap = useMemo(
    () => ({ bottom, top, left, right }),
    [bottom, top, left, right]
  );

  const plays = visiblePlays ?? state.trick.plays;
  const showLeft = left && left.id !== bottom.id;
  const showTop = top && top.id !== bottom.id && top.id !== left?.id;
  const showRight =
    right &&
    right.id !== bottom.id &&
    right.id !== left?.id &&
    right.id !== top?.id;

  const seatW = frameSize.default * 1.85;
  const seatH = frameSize.default * 2.2;
  const topSeatH = frameSize.default + 40;
  const topSeatStyle = {
    left: table.centerX - seatW / 2,
    top: Math.max(0, table.top - 24 - scene.h * 0.05),
    width: seatW,
    height: topSeatH,
  };

  return (
    <View style={styles.scene} onLayout={onSceneLayout}>
      {/* Table — Asset #2 */}
      <View
        style={[
          absBox({
            left: table.x,
            top: table.y,
            width: table.width,
            height: table.height,
          }),
          { zIndex: GAME_THEME.layers.playingTable },
        ]}
        pointerEvents="none"
      >
        <PlayingTable
          fill
          showThulla={plays.some((p) => p.isThulla)}
          highlightCenter={plays.length > 0}
        />
      </View>

      {ready && showTop && (
        <View style={[styles.seatSlot, styles.topSeat, topSeatStyle]}>
          <PlayerSeat
            player={top!}
            isCurrent={!waitingRoom && state.currentTurnPlayerId === top!.id}
            position="top"
            frameSize={frameSize.default}
            showFan={!waitingRoom}
            waiting={waitingRoom}
          />
        </View>
      )}

      {ready && showLeft && (
        <View
          style={[
            absBox(anchors.left.box(seatW, seatH)),
            styles.seatSlot,
          ]}
        >
          <PlayerSeat
            player={left!}
            isCurrent={!waitingRoom && state.currentTurnPlayerId === left!.id}
            position="left"
            frameSize={frameSize.default}
            showFan={!waitingRoom}
            waiting={waitingRoom}
          />
        </View>
      )}

      {ready && showRight && (
        <View
          style={[
            absBox(anchors.right.box(seatW, seatH)),
            styles.seatSlot,
          ]}
        >
          <PlayerSeat
            player={right!}
            isCurrent={!waitingRoom && state.currentTurnPlayerId === right!.id}
            position="right"
            frameSize={frameSize.default}
            showFan={!waitingRoom}
            waiting={waitingRoom}
          />
        </View>
      )}

      {ready && !hideBottomSeat && (
        <View
          style={[
            absBox(anchors.bottom.box(seatW * 1.05, seatH)),
            styles.seatSlot,
          ]}
        >
          <PlayerSeat
            player={bottom}
            isCurrent={!waitingRoom && state.currentTurnPlayerId === bottom.id}
            position="bottom"
            isLocal
            frameSize={frameSize.local}
            showFan={false}
            waiting={waitingRoom}
          />
        </View>
      )}

      {/* Each seated player's card space (+ turn timer on current seat) */}
      {ready &&
        (['bottom', 'left', 'top', 'right'] as const).map((origin) => {
          const occupied =
            origin === 'bottom' ||
            (origin === 'left' && showLeft) ||
            (origin === 'top' && showTop) ||
            (origin === 'right' && showRight);
          if (!occupied) return null;
          const seatPlayer = seatMap[origin];
          const isTurn =
            Boolean(seatPlayer) &&
            state.currentTurnPlayerId === seatPlayer.id &&
            turnSeconds != null &&
            state.phase !== 'game_complete';
          const spaceW = trickCard.w + 8;
          const spaceH = trickCard.h + 8;
          return (
            <View
              key={`space-${origin}`}
              pointerEvents="none"
              style={[
                absBox(trick[origin].box(spaceW, spaceH)),
                styles.playerSpace,
                {
                  borderRadius: trickCard.h * 0.08,
                  zIndex: GAME_THEME.layers.tableDecorations,
                },
                isTurn && styles.playerSpaceActive,
              ]}
            >
              {isTurn ? (
                <TurnSpaceTimer
                  width={spaceW}
                  height={spaceH}
                  progress={turnProgress}
                  secondsLeft={turnSeconds ?? turnDurationSec}
                  urgent={(turnSeconds ?? 99) <= 3}
                />
              ) : null}
            </View>
          );
        })}

      {/* Center trick — existing plays only */}
      {ready &&
        plays.map((play, index) => {
          const origin = originForPlayer(play.playerId, seatMap);
          const anchor = trick[origin];
          if (!anchor) return null;
          return (
            <View
              key={`${play.playerId}-${play.card.id}-${index}`}
              style={[
                absBox(anchor.box(trickCard.w, trickCard.h)),
                { zIndex: GAME_THEME.layers.playedCards + index },
              ]}
            >
              <TrickPlayCard
                play={play}
                origin={origin}
                index={index}
                total={plays.length}
                cardWidth={trickCard.w}
                cardHeight={trickCard.h}
                faceDown={faceDownPlays}
                slamStyle={slamStyle}
                collectX={
                  collectTo ? anchors[collectTo].x - trick[origin].x : undefined
                }
                collectY={
                  collectTo ? anchors[collectTo].y - trick[origin].y : undefined
                }
                onCollected={onCollectDone}
              />
            </View>
          );
        })}

      {ready && (
        <View
          style={[absBox(deck), { zIndex: GAME_THEME.layers.opponentCards }]}
          pointerEvents="none"
        >
          <CardBackView width={deck.width} height={deck.height} />
          <View style={{ position: 'absolute', left: 3, top: -3 }}>
            <CardBackView width={deck.width} height={deck.height} />
          </View>
        </View>
      )}

      <LayoutDebug
        table={table}
        seats={{
          top: anchors.top,
          left: anchors.left,
          right: anchors.right,
          bottom: anchors.bottom,
        }}
        trick={trick}
        hand={hand}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
  },
  seatSlot: {
    zIndex: GAME_THEME.layers.playerSeats,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerSpace: {
    borderWidth: 1.5,
    borderColor: 'rgba(247,241,227,0.72)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  playerSpaceActive: {
    borderWidth: 0,
    backgroundColor: 'rgba(214,175,85,0.06)',
  },
  topSeat: {
    position: 'absolute',
    justifyContent: 'flex-start',
  },
});
