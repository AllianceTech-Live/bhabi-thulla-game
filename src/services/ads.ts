import { Platform } from 'react-native';
import type { InterstitialAd as InterstitialAdType } from 'react-native-google-mobile-ads';

/**
 * AdMob placement hooks — Android only for now.
 * Never interrupt an active turn.
 */

export type AdPlacement =
  | 'home_banner'
  | 'between_rounds_interstitial'
  | 'results_rewarded';

/** Production AdMob Android units (Bhabi Thulla Card Game). */
const PROD = {
  banner: 'ca-app-pub-3712201782893807/3655837185',
  interstitial: 'ca-app-pub-3712201782893807/9047764668',
} as const;

function envUnit(key: string, fallback: string): string {
  const v = process.env[key];
  return typeof v === 'string' && v.startsWith('ca-app-pub-') ? v : fallback;
}

export const AD_UNITS = {
  banner: envUnit('EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID', PROD.banner),
  interstitial: envUnit(
    'EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_UNIT_ID',
    PROD.interstitial
  ),
} as const;

export function adsSupported(): boolean {
  return Platform.OS === 'android';
}

export function canShowAd(
  placement: AdPlacement,
  isActiveTurn: boolean
): boolean {
  if (!adsSupported()) return false;
  if (isActiveTurn) return false;
  void placement;
  return true;
}

let initPromise: Promise<boolean> | null = null;
let interstitial: InterstitialAdType | null = null;
let interstitialLoaded = false;

/** Initialize GMA SDK once (Android). Safe no-op elsewhere. */
export function initAds(): Promise<boolean> {
  if (!adsSupported()) return Promise.resolve(false);
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const { default: mobileAds, MaxAdContentRating } = await import(
          'react-native-google-mobile-ads'
        );
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.PG,
        });
        await mobileAds().initialize();
        await preloadInterstitial();
        return true;
      } catch {
        return false;
      }
    })();
  }
  return initPromise;
}

async function preloadInterstitial(): Promise<void> {
  if (!adsSupported()) return;
  try {
    const { InterstitialAd, AdEventType } = await import(
      'react-native-google-mobile-ads'
    );
    const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial);
    interstitial = ad;
    interstitialLoaded = false;
    ad.addAdEventListener(AdEventType.LOADED, () => {
      interstitialLoaded = true;
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialLoaded = false;
      ad.load();
    });
    ad.load();
  } catch {
    interstitial = null;
    interstitialLoaded = false;
  }
}

/** Full-screen interstitial — results / between rounds only. */
export async function showAd(placement: AdPlacement): Promise<void> {
  if (!canShowAd(placement, false)) return;
  if (placement === 'home_banner') return;
  try {
    await initAds();
    if (!interstitial) await preloadInterstitial();
    if (!interstitial || !interstitialLoaded) return;
    await interstitial.show().catch(() => undefined);
  } catch {
    // Ignore a single failed show.
  }
}
