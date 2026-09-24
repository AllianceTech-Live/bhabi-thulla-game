import { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  TABLE_COMPOSITION,
  resolveCentered,
  resolveRect,
  type NormPoint,
  type NormRect,
} from '../constants/tableLayout';

export type SceneSize = { width: number; height: number };

/** Measure a scene View and resolve TABLE_COMPOSITION (Asset #8) to pixels. */
export function useSceneLayout() {
  const [size, setSize] = useState<SceneSize>({ width: 0, height: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
        ? prev
        : { width, height }
    );
  }, []);

  const ready = size.width > 0 && size.height > 0;
  const short = Math.min(size.width || 1, size.height || 1);

  const layout = useMemo(() => {
    const W = size.width || 1;
    const H = size.height || 1;
    const frameDefault = TABLE_COMPOSITION.seatFrame.default * short;
    const frameLocal = TABLE_COMPOSITION.seatFrame.local * short;
    const trickCardH = TABLE_COMPOSITION.trick.cardScale * short;
    const trickCardW = trickCardH * (66 / 88);

    const seatBox = (pt: NormPoint, local?: boolean) => {
      const d = local ? frameLocal : frameDefault;
      return resolveCentered(pt, d * 1.7, d * 2.0, W, H);
    };

    return {
      table: resolveRect(TABLE_COMPOSITION.table, W, H),
      seats: {
        top: seatBox(TABLE_COMPOSITION.seats.top),
        left: seatBox(TABLE_COMPOSITION.seats.left),
        right: seatBox(TABLE_COMPOSITION.seats.right),
        bottom: seatBox(TABLE_COMPOSITION.seats.bottom, true),
      },
      fans: {
        top: resolveRect(TABLE_COMPOSITION.opponentFans.top, W, H),
        left: resolveRect(TABLE_COMPOSITION.opponentFans.left, W, H),
        right: resolveRect(TABLE_COMPOSITION.opponentFans.right, W, H),
      },
      trick: {
        well: resolveRect(TABLE_COMPOSITION.trick.well, W, H),
        slots: {
          top: resolveCentered(
            TABLE_COMPOSITION.trick.slots.top,
            trickCardW,
            trickCardH,
            W,
            H
          ),
          bottom: resolveCentered(
            TABLE_COMPOSITION.trick.slots.bottom,
            trickCardW,
            trickCardH,
            W,
            H
          ),
          left: resolveCentered(
            TABLE_COMPOSITION.trick.slots.left,
            trickCardW,
            trickCardH,
            W,
            H
          ),
          right: resolveCentered(
            TABLE_COMPOSITION.trick.slots.right,
            trickCardW,
            trickCardH,
            W,
            H
          ),
        },
        cardW: trickCardW,
        cardH: trickCardH,
      },
      hand: resolveRect(TABLE_COMPOSITION.hand.zone, W, H),
      localTag: resolveCentered(TABLE_COMPOSITION.localTag, 100, 28, W, H),
      chrome: {
        logo: resolveCentered(TABLE_COMPOSITION.chrome.logo, 120, 40, W, H),
        roomCode: resolveCentered(
          TABLE_COMPOSITION.chrome.roomCode,
          150,
          36,
          W,
          H
        ),
        settings: resolveCentered(
          TABLE_COMPOSITION.chrome.settings,
          36,
          36,
          W,
          H
        ),
        connection: resolveCentered(
          TABLE_COMPOSITION.chrome.connection,
          44,
          36,
          W,
          H
        ),
        chat: resolveCentered(TABLE_COMPOSITION.chrome.chat, 40, 40, W, H),
        emoji: resolveCentered(TABLE_COMPOSITION.chrome.emoji, 40, 40, W, H),
        voice: resolveCentered(TABLE_COMPOSITION.chrome.voice, 40, 40, W, H),
        sort: resolveCentered(TABLE_COMPOSITION.chrome.sort, 72, 36, W, H),
        autoSort: resolveCentered(
          TABLE_COMPOSITION.chrome.autoSort,
          72,
          36,
          W,
          H
        ),
        play: resolveCentered(TABLE_COMPOSITION.chrome.play, 100, 44, W, H),
        hint: resolveCentered(TABLE_COMPOSITION.chrome.hint, 36, 36, W, H),
        history: resolveCentered(
          TABLE_COMPOSITION.chrome.history,
          36,
          36,
          W,
          H
        ),
        deck: resolveCentered(TABLE_COMPOSITION.chrome.deck, 48, 64, W, H),
      },
      frameDefault,
      frameLocal,
      short,
    };
  }, [size.width, size.height, short]);

  return { size, onLayout, ready, layout };
}

export function absStyle(box: {
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  return {
    position: 'absolute' as const,
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
  };
}

export type { NormPoint, NormRect };
