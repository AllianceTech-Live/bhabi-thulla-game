import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AD_UNITS, adsSupported, canShowAd, initAds } from '@/src/services/ads';

type AdBannerProps = {
  isActiveTurn?: boolean;
};

/**
 * Native AdMob banner (Android + iOS). Renders nothing on web / Expo Go.
 */
export function AdBanner({ isActiveTurn = false }: AdBannerProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!adsSupported() || !canShowAd('home_banner', isActiveTurn)) {
      setReady(false);
      return;
    }
    let cancelled = false;
    void initAds().then((ok) => {
      if (!cancelled) setReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [isActiveTurn]);

  if (!adsSupported() || !ready) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');

    return (
      <View style={styles.wrap} pointerEvents="box-none">
        <BannerAd
          unitId={AD_UNITS.banner}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
        />
      </View>
    );
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
});
