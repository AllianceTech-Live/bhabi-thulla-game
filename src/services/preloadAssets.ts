import { Asset } from 'expo-asset';
import { Image } from 'react-native';
import { CARD_FACES } from '../components/cards/cardFaces';
import { GAME_ASSETS } from '../constants/gameAssets';

const sources = [
  ...Object.values(GAME_ASSETS),
  ...Object.values(CARD_FACES).flatMap((faces) => Object.values(faces)),
];
const localUris = new Map<number, string>();

let inflight: Promise<void> | null = null;

/**
 * Copy bundled art into the device cache and decode it.
 * Later game screens read the local file instead of decoding on first paint.
 */
export function preloadGameAssets(): Promise<void> {
  if (!inflight) {
    inflight = (async () => {
      const assets = sources.map((source) => Asset.fromModule(source));
      await Promise.all(assets.map((asset) => asset.downloadAsync()));
      const uris: string[] = [];
      assets.forEach((asset, index) => {
        const uri = asset.localUri ?? asset.uri;
        if (!uri) return;
        localUris.set(sources[index], uri);
        uris.push(uri);
      });
      await Promise.all(uris.map((uri) => Image.prefetch(uri).catch(() => false)));
    })().catch(() => undefined);
  }
  return inflight;
}

/** Local file uri after preload, otherwise the bundled asset. */
export function cachedAssetSource(
  source: number
): number | { uri: string } {
  const uri = localUris.get(source);
  return uri ? { uri } : source;
}
