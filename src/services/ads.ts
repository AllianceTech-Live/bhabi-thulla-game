import { Platform, TurboModuleRegistry } from 'react-native';
import type { InterstitialAd as InterstitialAdType } from 'react-native-google-mobile-ads';

/**
 * AdMob placement hooks — Android + iOS (native builds only, not Expo Go).
 * Never interrupt an active turn.
 */

export type AdPlacement =
  | 'home_banner'
  | 'between_rounds_interstitial'
  | 'results_rewarded';

/** Production AdMob Android units (Bhabi Thulla Card Game). */
const PROD_ANDROID = {
  banner: 'ca-app-pub-3712201782893807/3655837185',
  interstitial: 'ca-app-pub-3712201782893807/9047764668',
} as const;

/** Production AdMob iOS units (Bhabi Thulla Card Game). */
const PROD_IOS = {
  banner: 'ca-app-pub-3712201782893807/3685704881',
  interstitial: 'ca-app-pub-3712201782893807/5928724845',
} as const;

function pickUnit(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && value.startsWith('ca-app-pub-')
    ? value
    : fallback;
}

const ANDROID_UNITS = {
  banner: pickUnit(
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID,
    PROD_ANDROID.banner
  ),
  interstitial: pickUnit(
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_UNIT_ID,
    PROD_ANDROID.interstitial
  ),
} as const;

const IOS_UNITS = {
  banner: pickUnit(
    process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID,
    PROD_IOS.banner
  ),
  interstitial: pickUnit(
    process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_UNIT_ID,
    PROD_IOS.interstitial
  ),
} as const;

export const AD_UNITS =
  Platform.OS === 'ios' ? IOS_UNITS : ANDROID_UNITS;

let nativeAdsCached: boolean | null = null;

/** True on Android/iOS builds that include the AdMob native module (not Expo Go). */
export function adsSupported(): boolean {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;
  if (nativeAdsCached !== null) return nativeAdsCached;
  try {
    nativeAdsCached =
      TurboModuleRegistry.get('RNGoogleMobileAdsModule') != null;
  } catch {
    nativeAdsCached = false;
  }
  return nativeAdsCached;
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

/** Initialize GMA SDK once. Safe no-op when native ads are unavailable. */
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
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
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
    const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
      requestNonPersonalizedAdsOnly: true,
    });
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
