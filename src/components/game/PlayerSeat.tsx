import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { Player } from '../../game/types';
import { ART_DECO_PALETTE } from '../../constants/gameAssets';
import { GAME_THEME } from '../../constants/gameTheme';
import { CardBackView } from '../cards/CardBackView';
import { CARD_STYLE } from '../cards/cardStyle';
import { PlayerFrameRing } from './PlayerFrameRing';

interface PlayerSeatProps {
  player: Player;
  isCurrent: boolean;
  position: 'top' | 'left' | 'right' | 'bottom';
  isLocal?: boolean;
  /** Show opponent face-down fan (Asset #6) */
  showFan?: boolean;
  frameSize?: number;
  /** Lobby / pre-start: empty seat or joined player waiting for Start */
  waiting?: boolean;
}

function CardBackFan({
  toward,
  count,
}: {
  toward: 'down' | 'up' | 'right' | 'left';
  count: number;
}) {
  const n = Math.max(0, Math.min(5, count));
  if (n === 0) return null;
  const { w, h } = CARD_STYLE.sizes.mini;
  const mid = (n - 1) / 2;

  return (
    <View
      style={[
        styles.fan,
        (toward === 'left' || toward === 'right') && styles.fanHorizontal,
      ]}
    >
      {Array.from({ length: n }, (_, i) => (
        <View
          key={i}
          style={[
            styles.fanCard,
            {
              marginLeft:
                toward === 'down' || toward === 'up' ? (i - mid) * 9 : i * 5,
              zIndex: i,
            },
          ]}
        >
          <CardBackView width={w} height={h} />
        </View>
      ))}
    </View>
  );
}

/**
 * Asset #5 player frame + nameplate + card-count badge.
 */
export function PlayerSeat({
  player,
  isCurrent,
  position,
  isLocal,
  showFan = true,
  frameSize = 56,
  waiting = false,
}: PlayerSeatProps) {
  const emptySeat =
    waiting &&
    (player.id.startsWith('__waiting_') || player.name === 'Waiting');
  const count = player.hand.length;
  const escaped = player.status === 'escaped';
  const bhabhi = player.status === 'bhabhi';
  const label = emptySeat ? '…' : isLocal ? 'You' : player.name;
  const showCards = showFan && !waiting && !escaped && !bhabhi;

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!isCurrent || escaped || waiting) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1.06, {
        duration: 750,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, [isCurrent, escaped, waiting, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isCurrent && !waiting ? pulse.value : 1 }],
  }));

  const fanToward =
    position === 'top'
      ? 'down'
      : position === 'bottom'
        ? 'up'
        : position === 'left'
          ? 'right'
          : 'left';

  const sideBySide = position === 'left' || position === 'right';
  const avatar = Math.max(44, frameSize);

  return (
    <View
      style={[
        styles.seat,
        escaped && styles.escaped,
        !isCurrent && !escaped && styles.idle,
        emptySeat && styles.waitingSeat,
      ]}
    >
      <View style={[styles.row, position === 'right' && styles.rowReverse]}>
        {showCards && (sideBySide || position === 'top') ? (
          <CardBackFan toward={position === 'top' ? 'down' : fanToward} count={count} />
        ) : null}

        <View style={styles.avatarCol}>
          <Animated.View
            style={[
              styles.frameWrap,
              { width: avatar, height: avatar },
              isCurrent && !waiting && styles.frameActive,
              ringStyle,
            ]}
          >
            <PlayerFrameRing size={avatar} />
            <View
              style={[
                styles.avatarInner,
                emptySeat && styles.avatarWaiting,
                {
                  width: avatar * 0.62,
                  height: avatar * 0.62,
                  borderRadius: avatar,
                },
              ]}
            >
              <>
                <Text
                  style={[styles.circleName, { fontSize: avatar * 0.16 }]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                {!escaped && !bhabhi && !waiting ? (
                  <Text style={[styles.circleCount, { fontSize: avatar * 0.18 }]}>
                    {count}
                  </Text>
                ) : null}
              </>
            </View>
            {isCurrent && !escaped && !waiting && (
              <View style={styles.onlineDot} />
            )}
          </Animated.View>

          {showCards && position === 'bottom' ? (
            <View style={styles.fanBelow}>
              <CardBackFan toward="up" count={count} />
            </View>
          ) : null}
        </View>
      </View>

      {waiting ? (
        <Text style={styles.statusWaiting}>
          {emptySeat ? 'Waiting' : isLocal ? 'You' : 'Joined'}
        </Text>
      ) : null}
      {bhabhi && <Text style={styles.statusText}>Bhabhi</Text>}
      {escaped && !bhabhi && (
        <Text style={styles.statusEscaped}>Escaped</Text>
      )}
    </View>
  );
}

const { colors } = GAME_THEME;

const styles = StyleSheet.create({
  seat: {
    alignItems: 'center',
    padding: 2,
  },
  idle: { opacity: 0.82 },
  escaped: { opacity: 0.42 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowReverse: { flexDirection: 'row-reverse' },
  avatarCol: { alignItems: 'center' },
  frameWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameActive: {
    shadowColor: ART_DECO_PALETTE.goldLight,
    shadowOpacity: 0.95,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  avatarInner: {
    position: 'absolute',
    backgroundColor: ART_DECO_PALETTE.rail,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ART_DECO_PALETTE.online,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  avatarText: {
    color: colors.ivory,
    fontWeight: '800',
  },
  circleName: {
    color: colors.ivory,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: '90%',
  },
  circleCount: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '900',
    marginTop: -1,
  },
  fan: {
    width: 52,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fanHorizontal: {
    width: 56,
    height: 44,
  },
  fanAbove: { marginBottom: -6 },
  fanBelow: { marginTop: -6 },
  fanCard: {
    position: 'absolute',
  },
  nameplate: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11,11,11,0.88)',
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.45)',
    maxWidth: 130,
    gap: 6,
  },
  nameplateActive: {
    borderColor: ART_DECO_PALETTE.goldLight,
    backgroundColor: 'rgba(11,11,11,0.95)',
  },
  name: {
    color: colors.ivory,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  nameActive: {
    color: ART_DECO_PALETTE.goldLight,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: ART_DECO_PALETTE.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeActive: {
    backgroundColor: ART_DECO_PALETTE.goldLight,
  },
  badgeText: {
    color: '#1A120C',
    fontSize: 11,
    fontWeight: '900',
  },
  statusText: {
    marginTop: 3,
    color: '#FF8A7A',
    fontSize: 10,
    fontWeight: '800',
  },
  statusEscaped: {
    marginTop: 3,
    color: '#3DDC97',
    fontSize: 10,
    fontWeight: '700',
  },
  statusWaiting: {
    marginTop: 3,
    color: 'rgba(240,213,138,0.9)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  waitingSeat: {
    opacity: 0.78,
  },
  avatarWaiting: {
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.4)',
  },
});
